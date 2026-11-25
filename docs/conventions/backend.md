# Backend — padrões e antipadrões (`oriens-api`)

Stack: Spring Boot 4.2 · Java 25 · Spring Data JPA/Hibernate · PostgreSQL 15 · Spring Security (JWT) ·
OAuth Authorization Server + MCP · Lombok · JUnit 5.

Cada seção traz **✅ Padrão** (o que fazer, com referência ao código que já segue a regra) e
**❌ Antipadrão** (o que não fazer, e por quê). A referência viva do jeito certo é o domínio "work"
(tarefas, projetos, etiquetas, estatísticas, financeiro novo e MCP).

Sumário: [1. Camadas](#1-camadas-e-responsabilidades) · [2. Autorização e IDOR](#2-autorização-e-idor) ·
[3. N+1 e consultas](#3-n1-e-desempenho-de-consultas) · [4. Transações e concorrência](#4-transações-e-concorrência) ·
[5. Contrato HTTP](#5-contrato-http-dtos-e-validação) · [6. Erros](#6-erros) · [7. Banco e migrações](#7-banco-de-dados-e-migrações) ·
[8. Tempo](#8-datas-e-fuso-horário) · [9. Segurança geral](#9-segurança-geral) · [10. Testes](#10-testes) ·
[11. Dívida conhecida](#11-dívida-conhecida)

---

## 1. Camadas e responsabilidades

| Camada | Faz | Não faz |
|---|---|---|
| `controller/` | Lê `Authentication`, resolve o dono com `WorkOwner`, valida formato de entrada, chama o serviço, monta `ResponseEntity` (ETag, status) | Regra de negócio, consultas compostas, laços sobre entidades |
| `service/` | Regras de domínio, invariantes, transações, orquestração de repositórios | Conhecer HTTP (headers, `ResponseEntity`, `HttpServletRequest`) |
| `repository/` | Consultas JPA/JPQL **escopadas por dono** | Lógica condicional de negócio |
| `entity/` | Mapeamento JPA, `@Version`, invariantes simples | Ser serializada como resposta da API |
| `entity/dto/` | `record`s imutáveis de entrada (`WorkCommands`, `Patch*`) e saída (`WorkResponses`) | Carregar entidades JPA dentro |

✅ **Padrão** — controller fino, dono resolvido uma vez (`TaskController.get`):

```java
@GetMapping("/{id}")
@Transactional(readOnly = true)
public ResponseEntity<TaskView> get(Authentication auth, @PathVariable Long id) {
    TaskView result = read.taskView(owner.id(auth), id);
    return WorkHttp.ok(result, result.version());
}
```

❌ **Antipadrões**
- Injetar a **implementação** (`private final UserServiceImpl userService`) em vez da dependência real.
  Interface só existe se houver mais de uma implementação ou necessidade concreta de fronteira; caso
  contrário, uma classe concreta `XService` basta (sem par `XService`/`XServiceImpl` vazio).
- Repositório chamado direto do controller para montar regras (filtros de posse, combinações de
  consultas). Leitura simples paginada é aceitável quando a consulta já é escopada por dono.
- Nomes totalmente qualificados no meio do código (`com.oriens.oriens_api.exception.WorkDomainException`)
  — use `import`.
- `System.out.println` para log (ver `MvcConfig`). Use SLF4J (`LoggerFactory.getLogger` ou `@Slf4j`).

---

## 2. Autorização e IDOR

**IDOR** (Insecure Direct Object Reference): o cliente troca um ID na URL/corpo e lê ou altera dados de
outra pessoa. Estar autenticado **não** é estar autorizado. No Oriens, todo dado de domínio pertence a um
usuário, então **toda leitura e escrita precisa provar posse no banco**.

### 2.1 Regras

1. **O dono vem do token, nunca do cliente.** Obtenha-o com `WorkOwner.id(auth)`.
2. **Rotas com `{userId}`** usam `WorkOwner.matching(auth, userId)`, que falha se o `userId` da URL não for
   o do token. Rotas novas devem preferir **não** ter `userId` na URL (o dono já está no token).
3. **Rotas com `{id}` de recurso** buscam com o dono na própria consulta:
   `findByIdAndUserId(id, owner)`, `lockOwned(id, owner)`. Nunca `findById(id)` seguido de "se o dono for
   diferente, lança".
4. **Recursos filhos** (objetivo, coluna, etiqueta, anexo) validam a cadeia inteira: o filho pertence ao
   pai, e o pai pertence ao dono. Ex.: `objectives.findById(objectiveId).filter(o -> o.getProject().getId().equals(projectId))`
   **depois** de `project(owner, projectId)`.
5. **IDs recebidos no corpo** (`projectId`, `columnId`, `labelIds`, `tagId`) também são entrada não
   confiável: valide a posse de cada um antes de associar. Lista de IDs → uma consulta `...In(ids)` com
   dono, e compare o tamanho do resultado com o tamanho da entrada.
6. **Recurso de outro usuário responde 404** (`WorkDomainException("NOT_FOUND", …)`), igual a recurso
   inexistente. Retornar 403 revela que o ID existe e permite enumeração.
7. **Papéis administrativos** usam `@PreAuthorize("hasRole('ADMIN')")` no método *e* não aceitam o papel
   vindo do corpo da requisição.
8. **MCP** adiciona escopos: toda ferramenta checa o escopo exigido (`McpScopes`/`McpAuthorizations`)
   **além** da posse. Escopo nunca substitui o filtro por dono.

### 2.2 Exemplos

✅ **Padrão** — posse na consulta (`TaskRepository`):

```java
Optional<Task> findByIdAndUserId(Long id, Long ownerId);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select t from Task t where t.id = :id and t.user.id = :ownerId")
Optional<Task> lockOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);
```

```java
public Task task(Long owner, Long id) {
    return tasks.findByIdAndUserId(id, owner).orElseThrow(WorkReadService::missing); // 404
}
```

❌ **Antipadrão** — confiar no ID da URL (existe hoje em `NotificationController`, ver §11):

```java
@PostMapping("/{notificationId}/read")
public ResponseEntity<Void> markAsRead(@PathVariable Long notificationId) {
    notificationService.markAsRead(notificationId);   // qualquer usuário marca a notificação de qualquer outro
    ...
}

@GetMapping("/user/{userId}")
public List<Notification> list(@PathVariable Long userId) { ... } // troque o número e leia dados alheios
```

❌ **Antipadrão** — checar depois de carregar:

```java
Project p = projects.findById(id).orElseThrow();
if (!p.getUser().getId().equals(owner)) throw new AccessDeniedException(); // 403 revela existência;
// e é fácil esquecer em um dos caminhos. A posse precisa estar na consulta.
```

❌ **Antipadrão** — associar sem validar posse do ID recebido:

```java
task.setProjectId(command.projectId());   // projectId de outro usuário vira vínculo válido
```

### 2.3 Consultas agregadas e em lote também filtram por dono

`count`, `sum`, `exists`, `update`/`delete` em massa e consultas de estatística recebem o dono como
parâmetro. Um `@Modifying @Query("update Notification n set n.read = true where n.user.id = :userId")`
está correto **somente** se `userId` veio de `WorkOwner`, não da URL.

Ao projetar em lote, filtre também os vínculos (ex.: `WorkReadService.views` descarta projetos de outro
dono retornados por `findAllById` e lança 404 se a tarefa não for do dono).

### 2.4 Teste obrigatório

Todo endpoint novo ganha teste com **dois usuários**: o usuário B tenta ler, alterar e apagar o recurso de
A pelo ID e recebe **404**, e o recurso de A permanece intacto. Ver `WorkApiPostgresTest`.

---

## 3. N+1 e desempenho de consultas

**N+1**: uma consulta busca N registros e depois o código dispara mais uma consulta por registro (por
laço explícito ou por *lazy loading* de associação). 50 tarefas viram 51+ idas ao banco.

### 3.1 Regras

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
   usa o padrão do Spring — ver §11.)

### 3.2 Exemplos

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

### 3.3 Como verificar

- Em teste de integração, ligue `spring.jpa.properties.hibernate.generate_statistics=true` e verifique
  `Statistics#getPrepareStatementCount()` antes/depois da chamada: o número não pode crescer com o tamanho
  da lista (teste com 1 e com 20 itens).
- Localmente, `spring.jpa.show-sql=true` + `logging.level.org.hibernate.SQL=DEBUG` só na sua máquina; nunca
  commite isso ligado.
- Consulta nova em tabela grande: confira `EXPLAIN ANALYZE` e se há índice nas colunas de filtro e
  ordenação (`user_id`, `planned_date`, `project_id`…). Índice novo = migração (§7).

---

## 4. Transações e concorrência

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

---

## 5. Contrato HTTP, DTOs e validação

✅ **Padrão**
- Entrada: `record`s de comando (`WorkCommands.CreateTask`, `PatchTask`). PATCH distingue "campo ausente" de
  "campo nulo" (`PatchFields`).
- Saída: `record`s de visão (`TaskView`, `ProjectView`), com `version` para o próximo `If-Match`.
- JSON estrito: `WorkRequestBodyAdvice` rejeita formatos de data inválidos e entrada malformada. Controllers
  novos do domínio entram na lista `assignableTypes` dele e do `WorkExceptionHandler`.
- Paginação, ordenação e filtros validados no limite (`WorkPagination`, listas permitidas de `dateField`).
- Rotas aposentadas respondem `410 CLIENT_UPGRADE_REQUIRED` (`WorkHttp.retired()`) em vez de sumir sem aviso.
- Mudança de contrato consumido pelo front ou MCP é **aditiva**; remoção ou renome exige spec e versão.

❌ **Antipadrões**
- Retornar ou receber **entidade JPA** (`ResponseEntity<User>`, `@RequestBody User`): vaza campos internos,
  cria *mass assignment* (o cliente envia `role: "ADMIN"`), dispara *lazy loading* na serialização e acopla
  o schema ao contrato.
- `@RequestBody Map<String, Object>` com `instanceof` manual — use um `record` com Bean Validation
  (`@NotBlank`, `@Size`, `@Pattern`) e `@Valid`.
- Status HTTP inventado por controller (`new ResponseEntity<>(..., HttpStatus.NO_CONTENT)` com corpo).
- Mensagem de erro com detalhe técnico (stack, SQL, nome de classe) para o cliente.

---

## 6. Erros

✅ **Padrão** — o domínio lança `WorkDomainException(code, field, message)`; o `WorkExceptionHandler` mapeia
código → status e devolve o envelope `{code, message, fieldErrors, requestId}`:

| Código | HTTP | Uso |
|---|---|---|
| `INVALID_REQUEST` | 400 | Formato, tipo, faixa, paginação |
| `UNAUTHENTICATED` | 401 | Sem sessão válida |
| `FORBIDDEN` | 403 | Autenticado, mas sem papel/escopo (nunca para posse — posse é 404) |
| `NOT_FOUND` | 404 | Não existe **ou não é do dono** |
| `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT` | 409 | Concorrência |
| `CLIENT_UPGRADE_REQUIRED`, `RESOURCE_GONE` | 410 | Rota/recurso aposentado |
| `PRECONDITION_REQUIRED` | 428 | Faltou `If-Match` |
| `RATE_LIMITED` | 429 | MCP / limites |
| demais códigos de regra | 422 | Violação de regra de negócio |

- Mensagem ao usuário em pt-BR, acionável ("Recarregue antes de salvar."). Detalhe técnico vai para log.
- `field` aponta o campo do formulário quando houver, para o front exibir no lugar certo.

❌ **Antipadrões**
- `catch (Exception e) { return null; }`, `e.printStackTrace()` ou engolir exceção.
- Criar uma exceção nova por entidade (`XNotFoundException`) para o domínio work — use o código.
- `try/catch` em controller para converter em `ResponseEntity` (como em `uploadProfileAvatar`): deixe o
  handler global tratar.
- Logar dados sensíveis (senha, token, telefone, corpo de requisição OAuth/MCP).

---

## 7. Banco de dados e migrações

1. **`spring.jpa.hibernate.ddl-auto=validate`** em dev e prod. O Hibernate nunca cria ou altera tabela.
2. **Mudança de schema é uma migração Flyway aditiva** em
   `oriens-api/src/main/resources/db/migration/postgresql/V<n>__descricao.sql` (próximo número livre).
   O Flyway aplica no startup da API, em transação, e valida o checksum das já aplicadas: **nunca edite
   uma migração já aplicada** — crie a próxima. Rollback é de aplicação (a migração é aditiva, a versão
   anterior da API continua compatível); remover algo exige uma migração própria em entrega posterior.
   O diretório `{vendor}` mantém o SQL PostgreSQL fora dos testes H2. Bancos instalados pelos antigos
   runners de `ops/` são adotados por `LegacySchemaSeal` (versão de `oriens_schema_baseline` → baseline).
3. **Restrições no banco, não só no Java**: `NOT NULL`, `CHECK`, `UNIQUE`, FKs (inclusive compostas com
   `user_id` para garantir que filho e pai têm o mesmo dono).
4. **Índice** para toda coluna usada em filtro/ordenação de listagem nova.
5. Antes de aplicar em banco compartilhado: identificar ambiente, conferir backup e restore isolado
   (`ops/projects-refactor/db.py backup`/`restore`).

❌ **Antipadrões**
- `ddl-auto=update`/`create` fora do perfil de teste em memória.
- Apagar/renomear coluna na mesma entrega em que o código deixa de usá-la (quebra rollback).
- SQL nativo concatenando string do usuário (`"... where title like '%" + search + "%'"`): use parâmetros.

---

## 8. Datas e fuso horário

- O "hoje" do produto vem do `Clock` injetado (`ProductClockConfiguration`, zona `America/Recife`):
  `LocalDate.now(clock)`. Nunca `LocalDate.now()` sem `Clock` — não é testável e depende do fuso do servidor.
- Datas de calendário (`plannedDate`, `dueDate`) são `LocalDate`; instantes (`createdAt`) são `Instant`.
- Formato na API: `YYYY-MM-DD` e `HH:mm:ss`, validados por `WorkRequestBodyAdvice`.

---

## 9. Segurança geral

- Rotas públicas são exceção explícita em `SecurityConfig` (`permitAll`) e revisadas em PR.
- Segredos só por variável de ambiente (`JWT_SECRET`, `ORIENS_MCP_*`); nada de default inseguro em produção.
- Senhas com `PasswordEncoder` (BCrypt); campo de senha `@JsonProperty(access = WRITE_ONLY)`.
- Upload: limite de tamanho (já 2 MB), lista permitida de tipo/extensão, nome gerado pelo servidor,
  caminho normalizado (sem `..`), e posse do recurso ao qual o arquivo se vincula.
- CORS: lista explícita de origens confiáveis (`CorsConfig`), nunca `*` com credenciais.
- Limites de tamanho e taxa nas entradas abertas (OAuth/MCP já têm `McpRateLimiter` e
  `max-http-form-post-size`).
- Não registre em log JSON controlado por atacante (por isso `logging.level.io.modelcontextprotocol=OFF`).

---

## 10. Testes

| Tipo | Onde | Quando |
|---|---|---|
| Unitário de serviço (Mockito) | `src/test/.../service` | Regra de domínio isolada |
| Repositório | `src/test/.../repository` | Consulta JPQL nova |
| Integração Postgres | `src/test/.../work/*PostgresTest`, via `ops/postgres-tests.sh` | Contrato HTTP, posse (IDOR), concorrência, N+1, migrações |

Regras:
- Teste de IDOR com dois usuários para todo endpoint novo (§2.4).
- Teste de contagem de consultas para toda listagem nova (§3.3).
- Teste de conflito de versão para toda escrita nova com `@Version`.
- Testes dependentes de ambiente usam `@EnabledIfEnvironmentVariable` e documentam a variável.
- `Clock` fixo nos testes que dependem de data.
- Nomes de teste descrevem comportamento: `otherUserCannotReadTaskById`, não `test1`.

---

## 11. Dívida conhecida

Código anterior aos padrões acima. **Não use como modelo.** Corrigir exige tarefa própria (com testes de
IDOR), porque muda contrato com o front.

| Onde | Problema | Risco |
|---|---|---|
| `exception/config/GlobalExceptionHandler` + `ErrorResponse` | Formata `Instant` com padrão sem fuso: o Jackson falha ao serializar e a exceção original vaza como erro do servlet em todos os controllers legados | Alto |
| JWT | Papel lido do *claim*: admin rebaixado mantém acesso até o token expirar; `updateUserRole` não impede remover o último admin | Médio |
| `UserController`, `NotificationController`, `SupportController` | Entidade JPA na resposta e `@RequestBody User`/`SupportTicketDTO` sem validação; `clearAll` responde 204 com corpo | Médio (vazamento / mass assignment) |
| `SupportTicketServiceImpl` | `getTicketsByStatus`/`getDashboardStats` carregam todos os chamados e contam em Java; e-mail enviado dentro da requisição; `System.err` | Médio |
| `ProjectServiceImpl` e outros `*ServiceImpl` legados | `findById` sem dono; par interface/impl sem necessidade | Médio |
| `application-*.properties` | `spring.jpa.open-in-view` não desligado em dev/prod | Médio (N+1 escondido) |
| `WorkExceptionHandler` | Código `FORBIDDEN` fora do `switch` (um `WorkDomainException("FORBIDDEN")` vira 422); o 403 de papel vem do handler de `AccessDeniedException` | Baixo |
| `McpP2/P3/P4PostgresTest` | Não usam `@EnabledIfEnvironmentVariable`: sem `MCP_JDBC_URL`, `./mvnw test` falha com 113 erros | Médio (suíte sempre vermelha) |
| `McpP3PostgresTest` (finanças) | Entre 00h e 03h UTC (21h e meia-noite em `America/Recife`), quatro testes falham: `totalsCoverAllPagesWithExactCentsAndIndependentCategoryPaging`, `financialScopesAreIndependentAndReadsNeverRevealAnotherAccount`, `schedulerAndClosureOrDeletionSerializeOnTheOriginInBothOrders` e `everyMutationHasDurableReceiptVersionAndStrictMoneyAndPatchContracts`. Nesse intervalo a data UTC já é o dia seguinte e a de Recife ainda não, e os testes comparam as duas. Os runners do GitHub usam UTC, então o `test-postgres` fica vermelho em qualquer PR cujo CI rode nesse horário. Passa com `TZ=America/Recife` ou fora da janela. Visto pela primeira vez em 2026-11-19 (PR #12); reproduz em `dev` sem mudanças. Até a correção: se só esses quatro falharem, confira a hora UTC e rode o CI de novo depois das 03h UTC | Médio (CI vermelho por horário; o script para na falha e as suítes seguintes não rodam) |

**Resolvido em 2026-11-16** (branch `fix/security-and-ui-conventions`): IDOR em `UserController`
(perfil, preferências, avatar, exclusão e busca por e-mail), `NotificationController` e `SupportController`,
e as ações de admin de suporte sem `@PreAuthorize`. As rotas agora passam por `WorkOwner` (404 para recurso
alheio) e por `WorkExceptionHandler`, com testes em `UserControllerOwnershipTest` e
`NotificationSupportAccessTest`. Use esses testes como modelo.

**Resolvido em 2026-11-19** (branch `fix/avatar-upload-allowlist`): upload de avatar e de imagem de projeto
passam por `ImageUploads` (só JPG/PNG/GIF/WebP, conferidos pela assinatura do conteúdo; SVG/HTML recusados
com 422), e `/profile-pictures/**` e `/projects-pictures/**` só servem essas extensões, de modo que arquivos
gravados antes da correção deixam de ser servidos. `System.out.println` removido do `MvcConfig`. Testes em
`ImageUploadsTest` e `ProfilePictureUploadTest`.
