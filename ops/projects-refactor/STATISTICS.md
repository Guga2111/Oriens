# Evolução aditiva — Estatísticas e hábitos

> **Histórico (17/11/2026):** a instalação por runners selados descrita aqui foi substituída pelo
> Flyway (`src/main/resources/db/migration/postgresql`, V1–V6, aplicado no startup da API). Os scripts
> `*.py` de migração, os `.sha256` e os `test_*.py` citados foram removidos; para testes PostgreSQL use
> `scripts/postgres-tests.sh`. `db.py backup`/`restore`/`inventory` continuam válidos.

Revisão `oriens-statistics-v1`, sobre `oriens-task-labels-v1`. O desenho aprovado
está em [docs/plans/2026-11-15-statistics-design.md](../../docs/plans/2026-11-15-statistics-design.md).
Não reinstalar/resetar a baseline e não executar DDL automaticamente no startup.

## Conteúdo e invariantes

- `statistics.sql` e `.sha256`: instalação transacional, com preflight e índices
  por dono/data. A baseline original e seu checksum permanecem intactos.
- `statistics.py`: valida revisão anterior/checksum/selo do catálogo sob advisory
  lock. Repetição apenas verifica. Drift, revisão desconhecida ou erro revertem a
  transação inteira.
- `statistics_coverage.started_on`: início explícito do novo acompanhamento.
  `users.statistics_started_on`: data da implantação para contas existentes;
  para novas contas, default do banco em America/Recife. A cobertura apresentada é
  o maior desses marcos. Não inferir histórico pela primeira tarefa preservada.
- `habits`, `habit_schedules`, `habit_pauses`, `habit_executions`: frequência em
  dias fixos, definições prospectivas, pausas e unicidade hábito/data. FKs compostas
  protegem dono. Transações serializadas pela conta e versões impedem alterações
  concorrentes silenciosas. Execução não cria tarefas.
- `financial_entry.recurrence_started_on`: início confiável do processamento dessa
  definição. A criação/ativação pela API grava o relógio do produto. Não recuperar
  datas anteriores ao maior entre esse marco, a implantação e o dia após a origem.
- `financial_occurrences`: uma identidade pai/data. Registro original não recebe
  filho na mesma data. Claims e lançamentos são gravados juntos; a exclusão de um
  lançamento deixa somente a identidade consumida (entry_id nulo), evitando que
  o scheduler o recrie. Não preserva uma cópia do valor/descrição excluídos.
- Pai e categoria financeiros devem pertencer ao mesmo dono. Há unicidade física
  para filhos pai/data. O processamento é serializado entre instâncias pelo lock
  da linha de cobertura e usa o relógio Recife. Meses curtos limitam o dia à última
  data válida, preservando a âncora original no mês seguinte.

## Preflight e instalação

O preflight recusa duplicatas de recorrência, categorias de outro dono e pais
inválidos. Não apaga, agrupa, corrige valores ou inventa ocorrências antigas.
Se houver recusa, revisar os registros envolvidos e aprovar uma correção concreta
antes de tentar novamente. O selo anterior e os dados permanecem preservados.

1. Identificar literalmente ambiente, host, porta, banco e usuário. Não inferir
   alvo de `.env`, compose, serviço aberto ou conexão do desenvolvedor.
2. Abrir manutenção, parar escritores/schedulers, fazer backup completo com
   `db.py backup` e verificar restore em banco isolado, conforme o procedimento
   existente. Registrar commit e hashes do SQL/API/frontend.
3. Em banco já selado na revisão de etiquetas, aplicar somente esta evolução:

```sh
python3 oriens-api/ops/projects-refactor/statistics.py \
  --host HOST_EXPLICITO --port PORTA --database BANCO_EXATO --user OPERADOR
```

Usar `.pgpass`/PGPASSFILE protegido, sem senha nos argumentos. Em banco novo e
vazio, instalar baseline e etiquetas primeiro, pelos procedimentos respectivos.

4. Repetir o mesmo comando para conferir checksum/catálogo. Publicar API e frontend
   compatíveis juntos, com JPA `ddl-auto=validate` e a evolução já aplicada.
5. Smoke: escolher período, conferir série/detalhe; cadastrar hábito, registrar,
   desmarcar e pausar; conferir registros financeiros completos e filtros
   combinados; tentar ler/escrever recurso de outra conta. Examinar logs de
   recorrência e conferir que não existem filhos duplicados.

Nenhuma migração foi aplicada automaticamente a banco compartilhado durante o
desenvolvimento desta alteração. Os testes instalam exclusivamente em containers
próprios, com dados sintéticos e remoção do container pelo ID/nome criado.

## Compatibilidade e rollback

O frontend usa `/statistics/user/{id}/activity`, `/planning`, `/finance`, `/tasks`
e `/habits/user/{id}`. A rota antiga `/dashboard` permanece como adaptador dos
mesmos agregados, sem deltas ambíguos. Seu DTO inteiro não expressa taxa
indisponível/decimais; consumidores novos devem usar as rotas por domínio.

Manter o schema aditivo em rollback de aplicação. Não remover tabelas de hábitos,
claims, marcos ou constraints para reverter código. Código antigo não oferece
gestão dos novos dados; seu scheduler também não tem as novas regras de calendário.
Coordenar API/frontend/scheduler juntos. Se recuperação de banco for necessária,
restaurar backup conferido em alvo novo/isolado e coordenar a troca, sem sobrescrever
um banco existente ou executar rollback destrutivo automático.

## Prova reproduzível

```sh
python3 oriens-api/ops/projects-refactor/test_statistics.py --browser
```

Exige Docker com `postgres:15-alpine`, Maven/JDK 25, Node/dependências frontend e
Brave instalado. O frontend deve estar compilado com `VITE_API_BASE_URL=/api`.
O script cria PostgreSQL em tmpfs/loopback, instala revisões, prova recusa de
duplicatas sem perda, rollback total, repetição e selo. Executa MVC/JWT/JPA/SQL
reais, concorrência, populações de tarefas, precisão e filtros financeiros,
vigência/pausas/frequência dos hábitos, âncora e tombstones de recorrência. Com
`--browser`, usa o build de produção conectado a essa API isolada para o fluxo
de interface. Nenhuma credencial/conta/registro real é usado.

O runner P2 existente também evolui a revisão antes da prova da API. Os scripts
P0/P1 e a prova isolada de etiquetas continuam testando suas revisões próprias.
