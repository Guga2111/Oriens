# Evidência das skills do Oriens

Objetivo #26, tarefas #106 a #110. A entrega foi organizada em três blocos.
O [guia de skills](../guides/agent-skills.md) registra carregamento, gatilhos
e revisões das referências. A base de trabalho foi
`6d00508` (`chore/template-skill-4`).

## Bloco 1 — Estrutura, planejamento e pesquisa

As sete skills têm uma fonte canônica em `.agents/skills/`. Cada diretório
em `.claude/skills/` é um link relativo. Um clone Git limpo preservou os sete
links com modo `120000`. Codex CLI 0.172.0 listou as sete
habilitadas e apontando para o checkout via `skills/list` do app-server.
Claude Code 2.1.332 listou as sete com origem `projectSettings` via
`claude -p --strict-mcp-config --setting-sources project /skill-doctor`.

### #106 — Decomposição e duplicatas

Demanda sintética: baixar as reservas da oficina pela interface.
O primeiro resultado foi gerar CSV, com aceite de UTF-8, cabeçalho e duas
linhas de teste. O segundo foi expor a ação de download, que depende do
arquivo e tem como aceite baixar o CSV gerado. A busca por “agenda” fora do
quadro do objetivo encontrou “Gerar arquivo para a agenda”. O escopo
coincidiu com o primeiro resultado e o ID existente foi reutilizado.

A prova usou a infraestrutura do
[`McpP2PostgresTest`](../../apps/api/src/test/java/com/oriens/oriens_api/work/McpP2PostgresTest.java)
em uma cópia descartável, com Java 25, OAuth de teste e PostgreSQL 15.
Chamadas JSON-RPC de `tools/call` passaram pelo servidor MCP do Oriens.

| Passo | Chamadas e resultado |
|---|---|
| Consultar contexto e recorte | `get_context`, `get_project` e `get_board`: projeto e objetivo sintéticos `#1`, quadro inicialmente vazio |
| Procurar equivalência | `list_tasks` seguido de `get_task`: tarefa `#1` em outro recorte do mesmo projeto |
| Registrar | `update_task`: tarefa `#1` vinculada ao objetivo com seu aceite. `create_task`: tarefa `#2` criada com dependência de `#1` |
| Confirmar | `get_task` em ambos os IDs, `get_board` e `list_tasks`: exatamente duas entregas, com vínculo, aceite e dependência confirmados |

Um cenário passou com `scripts/postgres-tests.sh 'AgentPlanningProofTest#planningReusesEquivalentTaskAndConfirmsTwoDeliveries'`.
A classe de ensaio estendeu o harness existente na cópia descartável.
As consultas de contexto da entrega real usaram o MCP para ler as tarefas.
As escritas da prova ficaram no ambiente sintético.

### #107 — Recuperação e lacuna

| Fonte consultada | Leitura inicial | Agent Reach 1.6.1 |
|---|---|---|
| [Swag Labs](https://www.saucedemo.com/) | HTTP 200, 1.349 bytes, elemento raiz vazio | `agent-reach web read` via `jina` recuperou a seção renderizada “Accepted usernames are” na mesma URL |
| [Rota inexistente da documentação Playwright](https://playwright.dev/docs/oriens-fixture-missing-20261125) | HTTP 404 | O leitor marcou a extração como `ok: true`, com o conteúdo “Page Not Found”. O documento solicitado continuou indisponível |

A prova abriu apenas URLs públicas, sem autenticação, dados de conta ou
informações do backlog na consulta externa.

## Bloco 2 — UI e regressão visual

A landing ganhou uma descrição direta das funções, menos espaço vertical
no celular e texto em pt-BR, incluindo o atributo de idioma do documento.
O editor de tarefas volta o foco para **Título** ao enviar sem título.
A mensagem fica associada ao campo e o anel de foco usa o token existente.
Em desktop foi inspecionado o diálogo e em mobile, o drawer.

As imagens abaixo foram comparadas nas quatro combinações. Na inspeção com
`playwright-cli` 0.1.25, as oito capturas passaram sem overflow, erros no
console ou requisições inesperadas. A suíte confere
a navegação do CTA pelo teclado, o idioma, a ausência de overflow, o foco e a
descrição acessível na validação, e o fechamento com Escape.

| Superfície | Viewport e tema | Antes | Depois |
|---|---|---|---|
| Landing | Desktop claro | [PNG](../screenshots/agent-skills/before-landing-desktop-light-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/landing-desktop-light-linux.png) |
| Landing | Desktop escuro | [PNG](../screenshots/agent-skills/before-landing-desktop-dark-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/landing-desktop-dark-linux.png) |
| Landing | Mobile claro | [PNG](../screenshots/agent-skills/before-landing-mobile-light-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/landing-mobile-light-linux.png) |
| Landing | Mobile escuro | [PNG](../screenshots/agent-skills/before-landing-mobile-dark-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/landing-mobile-dark-linux.png) |
| Editor | Desktop claro | [PNG](../screenshots/agent-skills/before-task-editor-validation-desktop-light-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/task-editor-validation-desktop-light-linux.png) |
| Editor | Desktop escuro | [PNG](../screenshots/agent-skills/before-task-editor-validation-desktop-dark-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/task-editor-validation-desktop-dark-linux.png) |
| Editor | Mobile claro | [PNG](../screenshots/agent-skills/before-task-editor-validation-mobile-light-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/task-editor-validation-mobile-light-linux.png) |
| Editor | Mobile escuro | [PNG](../screenshots/agent-skills/before-task-editor-validation-mobile-dark-linux.png) | [PNG](../../apps/client/e2e/visual/surfaces.spec.ts-snapshots/task-editor-validation-mobile-dark-linux.png) |

- **#108** Design Taste para a landing. Impeccable para a validação no
  editor. Tokens e componentes foram conferidos pelo guia vigente e
  pela renderização nos dois temas. No código anterior, as verificações
  de idioma do documento e de foco do título falharam em desktop claro.
  `npm run lint` sem erros,
  `npm run build` passou e `npm test` passou com 375 testes.
- **#110** `npm run test:visual` no container Chromium 1.65.0 em Linux amd64
  passou em duas execuções independentes, 8 de 8 em cada. Em uma cópia
  descartável, o fundo da landing trocado de `bg-background` para
  `bg-destructive` reprovou `--project=mobile-dark --grep=landing`, com
  214.367 pixels diferentes. O relatório e o
  [PNG do diff](../screenshots/agent-skills/landing-intentional-diff.png)
  foram gerados. `npm run test:e2e -- --list` encontrou os 90 casos funcionais
  em seus dois projetos.

## Bloco 3 — Revisões em PR

### PR de documentação

[PR #39](https://github.com/Guga2111/Oriens/pull/39), destino e merge-base
`02ba7000c9fb961885a3846923c08610fe563004`, head
`906fd199db3c9533247bdd00f0a034bd508464a9`.

- **Segurança**. Triagem sem mudança nas fronteiras do produto. O job `docs`
  adicionado em `.github/workflows/checks.yml:18` usa checkout sem persistir
  credenciais e executa os validadores locais com as permissões de leitura
  do workflow. O aceite remoto de proteção de branches pertence à #56.
- **Código**. A reorganização liga os guias ativos ao índice. O verificador
  lê o inventário de Git em `scripts/check-docs-links.py:117` e os testes
  cobrem caminhos, âncoras e o limite de linhas. Sem achados bloqueantes
  no escopo. Os dois comandos de documentação passaram na árvore de merge
  `fe81044`, com 136 Markdown válidos e sete testes do verificador. A árvore
  revisada localmente é a referência da recomendação.

### Diff de autorização

Destino e merge-base `e4efeb21287999cc589b2a210e1633ebf3bdc699`, head
`334796bf6216800b8df412ea306f3083834fadcc`, com caminhos da época
(ver [diff](https://github.com/Guga2111/Oriens/commit/334796bf6216800b8df412ea306f3083834fadcc)).

- **Segurança**. Impacto presente na fronteira de conta via REST. Em
  `UserController.java:33`, `:61`, `:88` e `:109`, `WorkOwner` compara o
  principal com o alvo antes da leitura ou escrita. A busca por e-mail
  vê somente a conta do principal (`:53`). `WorkExceptionHandler.java:55`
  preserva 403 para acesso administrativo negado. Os testes confirmam 404
  para outra conta e para ID inexistente, sem alteração de dados da conta.
- **Código**. As oito verificações de `UserControllerOwnershipTest` passaram
  com Maven offline em container JDK 17 sem rede, com cache de dependências
  somente leitura. A resposta de perfil ainda carrega a entidade JPA
  (`UserController.java:34`, `User.java:56`), uma dívida preexistente de
  projeção. Uma eventual mudança para DTO exige conferir os consumidores.
  O cenário de posse revisado passou. A prova usou MockMvc/H2 e se limita
  aos endpoints do diff e ao tratamento exercitado pelos testes.

## Dependências

- **#72** segue pendente. Os guias, tokens e componentes vigentes orientaram
  a revisão de UI e as baselines.
- **#64** segue pendente. O [fluxo de revisão](../guides/pull-request-review.md)
  registra os campos a incorporar e como usá-los na descrição atual dos PRs.
- **#56** segue pendente. O workflow visual roda em PRs para dev e main.
  O GitHub ainda precisa confirmar execuções estáveis, o artefato em caso de
  falha e o nome que deve ser exigido na proteção de branches.
