# Plano de design — coluna Backlog e as 5 colunas padrão do quadro

**Data:** 2026-11-24
**Autor:** Claude Code
**Status:** aprovada em 2026-11-24 com as decisões da seção 0 — em implementação
**Branch de origem:** `feat/design-plane-shell` (o visual das colunas já foi entregue sem commit)

**Pedido do usuário (2026-11-24):** "Cada quadro no kanban do projeto no plane.so já vem com 5 predefinidos e com seu
ícone. Quero refatorar para ficar igual, usando o mesmo padrão de ícones." Na pergunta sobre o caminho, a escolha foi
**"Visual + tipo Backlog de verdade"**.

## 0. Decisões do usuário (2026-11-24)

1. **Backlog e To-Do são estados diferentes**, mesmo mudando contratos e dados de produção: vale a **opção B**
   (novo valor `BACKLOG` no estado da tarefa), com migração.
2. **Nomes em inglês**, padrão da indústria: **Backlog, To-Do, In Progress, Done, Cancelled**.
3. **Tarefa nova de projeto vai para o Backlog** (coluna padrão de pendentes = Backlog).
4. **Projetos existentes migram** por Flyway: ganham Backlog e Cancelled e as colunas padrão antigas são renomeadas.

As seções 3 a 5 e 9 abaixo registram a proposta original; onde divergem, valem estas decisões e a seção 10.

## 1. O que já foi entregue (só front, sem mudar contrato)

- Cada coluna mostra o ícone do seu estado no padrão do Plane: `○` A fazer, `◎` âmbar Em andamento, `✓` verde
  preenchido Concluída e `✕` vermelho preenchido Cancelada. O componente fica em `components/tasks/StatusIcon.tsx`
  e é o mesmo do painel da tarefa.
- O nome da coluna fica sem negrito, a contagem é discreta e o fundo usa um cinza mais claro (`bg-muted/40`).
- Novos tokens `--state-started`, `--state-completed` e `--state-cancelled`, em claro e escuro.

Falta o que depende do backend: o **Backlog** como tipo próprio, com ícone tracejado `◌`, e as **5 colunas padrão**
em projeto novo.

## 2. Como está hoje

- `ProjectColumn.kind` é o enum `Status` das tarefas (`PENDING`, `ON_DOING`, `CONCLUDED`, `CANCELLED`). A coluna
  define o estado da tarefa que está nela.
- `ProjectWorkService.initializeBoard` cria 3 colunas: **A fazer** (`PENDING`, coluna padrão de pendentes),
  **Fazendo** (`ON_DOING`) e **Concluídas** (`CONCLUDED`, coluna padrão de concluídas).
- `ColumnView`, `CreateColumn` e o esquema `COLUMN` do MCP (`McpWorkCatalog`) expõem `kind`.

O Plane separa a **coluna** ("state") do **grupo** dela: backlog, unstarted, started, completed e cancelled. No Oriens
o grupo é o próprio `Status` da tarefa, que não tem backlog.

## 3. Decisão principal: onde mora o Backlog

### Opção A — atributo da coluna (recomendada)

Nova coluna booleana `project_column.backlog`, `false` por padrão, válida só quando `kind = PENDING`.

- A tarefa no Backlog continua `PENDING`. Nada muda em Hoje, estatísticas, lembretes, filtros, MCP de tarefas nem
  nas regras de conclusão.
- A coluna ganha o ícone tracejado e o nome "Backlog". O quadro, o seletor de coluna do painel e o MCP passam a ver
  `backlog: true`.
- Migração aditiva `V8__project_column_backlog.sql`: `alter table project_column add column backlog boolean not null default false`.

### Opção B — novo valor no enum de estado

Adicionar `BACKLOG` a `Status`. É mais fiel ao Plane, mas muda o estado de **tarefas**: Hoje, estatísticas,
lembretes, `TASK_STATUS` no front, os filtros e o contrato público do MCP (`status` em todas as ferramentas de tarefa)
teriam que tratar um estado novo, e clientes MCP antigos receberiam um valor desconhecido. O custo e o risco são bem
maiores para o mesmo resultado visual.

**Recomendação:** opção A.

## 4. As 5 colunas padrão (projetos novos)

`initializeBoard`, usado na criação e na conversão de simples para desenvolvimento, passa a criar:

| Posição | Nome | `kind` | `backlog` | Papel |
|---|---|---|---|---|
| 0 | Backlog | PENDING | true | — |
| 1 | A fazer | PENDING | false | coluna padrão de pendentes |
| 2 | Em andamento | ON_DOING | false | — |
| 3 | Concluídas | CONCLUDED | false | coluna padrão de concluídas |
| 4 | Canceladas | CANCELLED | false | — |

- A coluna padrão de novas tarefas continua sendo **A fazer**, e não o Backlog. Assim, tarefa criada em Hoje, pelo
  editor ou pelo MCP não some num backlog. *(Pergunta em aberto 1.)*
- "Fazendo" passa a se chamar "Em andamento", como o rótulo do estado.

## 5. Projetos existentes

Nenhuma migração de dados automática: o quadro de cada pessoa é dela. Em **Configurar quadro** entra a ação
"Adicionar colunas padrão", que cria só as que faltam (Backlog e Canceladas), com a versão do projeto (`If-Match`). *(Pergunta em aberto 2.)*

## 6. Contrato

- `ColumnView` ganha `backlog: boolean`.
- `CreateColumn` e a edição de coluna aceitam `backlog` opcional. Com `backlog: true` e `kind` diferente de `PENDING`,
  a resposta é **400** com mensagem de campo.
- MCP: o esquema `COLUMN` ganha `backlog` (aditivo; clientes antigos ignoram). A descrição de `oriens_create_project`
  passa a citar as 5 colunas. `docs/mcp.md` é atualizado.
- Escopo pelo dono e versão do projeto seguem o padrão atual de colunas (`lockOwned`, 404 para outro dono).

## 7. Front

- `StatusIcon` aceita a coluna: `backlog` usa `CircleDashed` em `text-muted-foreground`.
- Quadro, seletor de coluna do painel da tarefa e `BoardSettings` mostram o ícone e permitem marcar uma coluna
  "A fazer" como Backlog.
- Nada muda nos cards.

## 8. Testes

- Backend: criação de projeto com as 5 colunas e padrões corretos; conversão de simples para desenvolvimento; validação
  `backlog` só com `PENDING` (400); ação de completar colunas em projeto antigo (idempotente, com versão; 409 com versão
  velha; 404 para outro dono); `ColumnView` e MCP expondo `backlog`. `McpWorkCatalog` com o campo novo.
- Front: ícone tracejado para coluna de backlog no quadro e no painel; `BoardSettings` marcando Backlog; ação de completar.
- E2E: projeto novo abre com as 5 colunas e seus ícones.

## 9. Perguntas em aberto

1. A coluna padrão de novas tarefas fica em **A fazer** (recomendado) ou em **Backlog**, como no Plane?
2. Projetos existentes: só a ação manual em Configurar quadro (recomendado), ou uma migração que adicione Backlog e
   Canceladas a todos?
3. Opção A (atributo da coluna, recomendada) ou B (novo estado de tarefa)?

## 10. Implementação aprovada (opção B)

- `Status` ganha `BACKLOG`. Estados **abertos** passam a ser `BACKLOG`, `PENDING` e `ON_DOING`: Hoje, lembretes,
  prazos ultrapassados, estatísticas e o filtro "Somente abertas" tratam Backlog como tarefa aberta.
- Projeto novo (criação e conversão): **Backlog** (`BACKLOG`, padrão de pendentes), **To-Do** (`PENDING`),
  **In Progress** (`ON_DOING`), **Done** (`CONCLUDED`, padrão de concluídas) e **Cancelled** (`CANCELLED`).
- A coluna padrão de pendentes aceita `BACKLOG` ou `PENDING`. Pedir o estado `PENDING` ou `BACKLOG` sem coluna leva à
  primeira coluna daquele tipo; transferir uma tarefa entre projetos preserva o tipo quando o destino o tem.
- Tarefa avulsa continua nascendo `PENDING` (não tem quadro).
- Migração `V8__backlog_state.sql`, em cada projeto de desenvolvimento:
  - aceita `BACKLOG` nas restrições de `tasks.status` e `project_columns.kind` e no índice parcial de atrasos;
  - renomeia `A fazer`→`To-Do`, `Fazendo`→`In Progress`, `Concluídas`→`Done` quando o nome novo está livre (nomes
    personalizados ficam);
  - cria **Backlog** na posição 0 (as demais descem uma posição) e **Cancelled** no fim, se o projeto ainda não tem
    coluna cancelada; se o nome já existir, usa um sufixo;
  - aponta a coluna padrão de pendentes para o Backlog e incrementa a versão do projeto;
  - não move tarefas: cada uma continua na sua coluna e no seu estado.
- MCP: `BACKLOG` entra no enum de estado de tarefas e colunas (mudança de contrato aceita pelo usuário).
- Front: `TaskStatus` e rótulos ganham Backlog, com ícone tracejado.
