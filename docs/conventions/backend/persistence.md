# Consultas, concorrência e migrações

Consulte as [regras de autorização](security.md) e os ADRs de
[Flyway](../../decisions/001-flyway.md) e [concorrência](../../decisions/003-concorrencia.md).

## N+1 e desempenho de consultas

**N+1**: uma consulta busca N registros e depois o código dispara mais uma consulta por registro (por
laço explícito ou por *lazy loading* de associação). 50 tarefas viram 51+ idas ao banco.

### Regras

1. **Nunca chame repositório dentro de laço**, `stream().map()`, `forEach` ou mapper chamado por item.
2. **Associações JPA são `LAZY`** (`@ManyToOne(fetch = FetchType.LAZY)`). Nunca troque para `EAGER` para
   "resolver" N+1: isso só esconde o problema e carrega dados demais em toda consulta.
3. **Projeção em lote**: colete os IDs, busque cada tipo de vínculo **uma vez** (`findAllById(ids)`,
   `findByProjectIdIn(ids)`, consulta JPQL com `in :ids`) e monte um `Map<Long, …>` para compor a resposta.
   O número de consultas deve ser constante em relação ao tamanho da lista.
4. **`join fetch`** quando você precisa da associação de **todas** as linhas e ela é *to-one*
   (ex.: `lockReminder` usa `join fetch t.user`). Para coleções *to-many*, prefira consulta separada em
   lote; `join fetch` de coleção com paginação faz o Hibernate paginar em memória.
5. **Contagens e somas no banco** (`count`, `sum`, `group by`), não carregando entidades para contar em Java.
6. **Leitura que só precisa de poucos campos** usa projeção (`select new …` / interface) ou consulta de
   escalares, não a entidade inteira.
7. **Toda listagem é paginada** com limite máximo e ordenação em lista permitida — use `WorkPagination.of`,
   que valida `size` (1–100), restringe `sortBy` a campos permitidos e adiciona `id` como desempate estável.
8. **Filtros opcionais em JPQL** seguem o padrão `(:param is null or …)` com `cast(:param as …)` quando o
   tipo for ambíguo no PostgreSQL. Nada de concatenar strings para montar consulta.
9. **Sem `open-in-view`.** Os testes de integração rodam com `spring.jpa.open-in-view=false`; código novo
   não pode depender de *lazy loading* fora da transação do serviço. (A configuração de produção ainda
   usa o padrão do Spring — consulte a [dívida conhecida](../debt.md#api).)

### Exemplos

✅ **Padrão** — `WorkReadService.views`, uma consulta por tipo de vínculo:

```java
/** Bounded batch projection: one query per link type, never one query per task. */
public List<TaskView> views(Long owner, List<Task> source) {
    Set<Long> projectIds = source.stream().map(Task::getProjectId).filter(Objects::nonNull).collect(toSet());
    Map<Long, Project> ps = projects.findAllById(projectIds).stream()
        .filter(p -> p.getUser().getId().equals(owner))
        .collect(toMap(Project::getId, identity()));
    Map<Long, Objective> os = objectives.findAllById(objectiveIds(source)).stream()...;
    Map<Long, List<LabelView>> labels = taskLabels.forTasks(owner, taskIds(source)); // 1 consulta
    return source.stream().map(t -> toView(t, ps.get(t.getProjectId()), os.get(...), labels...)).toList();
}
```

Para um recurso só, reaproveite o mesmo caminho: `view(owner, task)` chama `views(owner, List.of(task))`.
Não escreva uma segunda montagem "simples" que divirja da de lista.

❌ **Antipadrão** — consulta por item:

```java
return tasks.stream().map(t -> {
    Project p = projectRepository.findById(t.getProjectId()).orElse(null);      // N consultas
    List<TaskLabel> labels = labelRepository.findByTaskId(t.getId());           // +N consultas
    return new TaskView(..., p.getTitle(), labels);
}).toList();
```

❌ **Antipadrão** — N+1 escondido por *lazy loading*:

```java
for (Project p : projects) {
    dto.add(new ProjectSummary(p.getTitle(), p.getTasks().size()));   // carrega a coleção inteira de cada projeto
}
// Correto: uma consulta "select t.projectId, count(t) ... where t.projectId in :ids group by t.projectId"
```

❌ **Antipadrão** — contar em Java:

```java
long done = taskRepository.findByUserId(owner).stream().filter(t -> t.getStatus() == CONCLUDED).count();
// Correto: countCompletedPlanned(owner, start, end)
```

### Como verificar

- Em teste de integração, ligue `spring.jpa.properties.hibernate.generate_statistics=true` e verifique
  `Statistics#getPrepareStatementCount()` antes/depois da chamada: o número não pode crescer com o tamanho
  da lista (teste com 1 e com 20 itens).
- Localmente, `spring.jpa.show-sql=true` + `logging.level.org.hibernate.SQL=DEBUG` só na sua máquina; nunca
  commite isso ligado.
- Consulta nova em tabela grande: confira `EXPLAIN ANALYZE` e se há índice nas colunas de filtro e
  ordenação (`user_id`, `planned_date`, `project_id`…). Índice novo = migração ([migrações](#banco-de-dados-e-migrações)).

## Transações e concorrência

1. **`@Transactional` no serviço** que escreve; leituras com `@Transactional(readOnly = true)`.
   Uma operação de negócio = uma transação.
2. **Sem chamadas externas dentro de transação** (e-mail, Twilio, HTTP). Publique um evento
   (`@TransactionalEventListener(phase = AFTER_COMMIT)`) ou chame depois do commit.
3. **Otimismo por padrão**: entidades editáveis têm `@Version`. O cliente envia a versão lida
   (`If-Match: "<versão>"` e/ou `version` no corpo; `WorkHttp.agree` exige que coincidam). Divergência →
   `409 VERSION_CONFLICT`.
4. **Lock pessimista** (`lockOwned`, `PESSIMISTIC_WRITE`) quando a operação lê-e-decide sobre vários
   registros (reordenar coluna, mover tarefa entre colunas, enviar lembrete uma única vez). Adquira locks
   sempre na **mesma ordem** (usuário → projeto → tarefa) para evitar deadlock.
5. **Criação idempotente**: `POST` de criação aceita `Idempotency-Key` e passa por `WorkCreationService`,
   que serializa pela linha do usuário e devolve o mesmo resultado em reenvio. Não crie outro mecanismo.
6. **Jobs agendados** (`controller/scheduler/`) processam por ID com lock e flag
   (`reminderSent`, `overdueNotificationSent`) para não duplicar efeito se rodarem em paralelo.

❌ **Antipadrões**
- `@Transactional` em métodos `private` ou chamados de dentro da mesma classe (o proxy do Spring é ignorado).
- Capturar `OptimisticLockException` e "tentar de novo" silenciosamente sobrescrevendo a edição do usuário.
- Ler, decidir em Java e salvar sem versão nem lock ("last write wins").
- Transação longa envolvendo upload de arquivo ou chamada de rede.

## Banco de dados e migrações

1. **`spring.jpa.hibernate.ddl-auto=validate`** em dev e prod. O Hibernate nunca cria ou altera tabela.
2. **Mudança de schema é uma migração Flyway aditiva** em
   `apps/api/src/main/resources/db/migration/postgresql/V<n>__descricao.sql` (próximo número livre).
   O Flyway aplica no startup da API, em transação, e valida o checksum das já aplicadas: **nunca edite
   uma migração já aplicada** — crie a próxima. Para rollback de aplicação, comprove a compatibilidade
   da versão anterior com o schema e os dados escritos pela versão atual. Remoções exigem migração
   própria em entrega posterior. [Falha e rollback](../../guides/deploy.md#falha-e-rollback)
   O diretório `{vendor}` mantém o SQL PostgreSQL fora dos testes H2. Bancos instalados pelos antigos
   runners de migração são adotados por `LegacySchemaSeal` (versão de `oriens_schema_baseline` → baseline).
3. **Restrições no banco, não só no Java**: `NOT NULL`, `CHECK`, `UNIQUE`, FKs (inclusive compostas com
   `user_id` para garantir que filho e pai têm o mesmo dono).
4. **Índice** para toda coluna usada em filtro/ordenação de listagem nova.
5. Antes de aplicar em banco compartilhado: identificar ambiente, conferir backup e restore isolado
   ([inventário, backup e restore](../../guides/database-operations.md)).

❌ **Antipadrões**
- `ddl-auto=update`/`create` fora do perfil de teste em memória.
- Apagar/renomear coluna na mesma entrega em que o código deixa de usá-la (quebra rollback).
- SQL nativo concatenando string do usuário (`"... where title like '%" + search + "%'"`): use parâmetros.
