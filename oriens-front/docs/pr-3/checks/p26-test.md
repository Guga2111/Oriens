```text

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.7 /private/tmp/oriens-pr3/final-history/6787ab7/oriens-front

(node:91309) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:91308) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/project-card-objective-index.test.tsx > ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:91311) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-card-objective-index.test.tsx (4 tests) 759ms
   ✓ ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)  694ms
(node:91310) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/projects-page-delete.test.tsx > ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

 ✓ src/__tests__/task-chip.test.tsx (5 tests) 1307ms
   ✓ TaskChip — visão semanal > conclui pelo checkbox enviando o objeto inteiro  301ms
   ✓ TaskChip — visão semanal > menu marca a tarefa como em andamento  389ms
   ✓ TaskChip — visão semanal > excluir só chama DELETE após a confirmação  329ms
 ✓ src/__tests__/admin-mobile.test.tsx (2 tests) 1300ms
   ✓ admin mantém ações e badges em 390px com dados simulados  958ms
   ✓ admin mantém ações e badges em 1440px com dados simulados  341ms
 ✓ src/__tests__/task-row-status.test.tsx (6 tests) 1656ms
   ✓ TaskRow — ciclo de status (D9) > PENDING → CONCLUDED envia o objeto inteiro no PUT  521ms
   ✓ TaskRow — ciclo de status (D9) > menu marca como em andamento  375ms
   ✓ TaskRow — ciclo de status (D9) > excluir só chama DELETE após a confirmação  322ms
(node:91312) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/project-detail-a9-dialogs.test.tsx > ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:91307) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/entry-history-table.test.tsx (3 tests) 1145ms
   ✓ EntryHistoryTable — histórico independente do mês > alinha os valores à direita com sinal e tokens de cor  515ms
   ✓ EntryHistoryTable — histórico independente do mês > usa Pagination com página atual e navegação  304ms
   ✓ EntryHistoryTable — histórico independente do mês > só exclui depois da confirmação  324ms
 ✓ src/__tests__/projects-page-delete.test.tsx (2 tests) 1505ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar  1169ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE ao cancelar  334ms
(node:91313) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/dashboard-period-grouping.test.tsx (2 tests) 672ms
   ✓ DashboardPage — agrupamento de tarefas por período > respeita as fronteiras 11:59:59/12:00:00 e 17:59:59/18:00:00  527ms
(node:91305) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/form-validation.test.tsx > edição de tarefa mantém status e payload completo e mostra falha inline
Erro ao atualizar tarefa: Error: offline
    at /private/tmp/oriens-pr3/final-history/6787ab7/oriens-front/src/__tests__/form-validation.test.tsx:40:50
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)
    at runTest (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)
    at runSuite (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1729:8)
    at runFiles (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1787:3)
    at startTests (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1820:3)

(node:91306) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-detail-a9-dialogs.test.tsx (2 tests) 2099ms
   ✓ ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **  1065ms
   ✓ ProjectDetailPage — A9 diálogos > não tem botão vazio absoluto e oferece 'Limpar data' dentro do PopoverContent  1032ms
 ✓ src/__tests__/form-validation.test.tsx (6 tests) 1807ms
   ✓ nova tarefa associa os erros aos campos e impede envio inválido  652ms
   ✓ BE6: 403 ao criar tag permanece no formulário sem perder os dados  409ms
(node:91384) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/reusable-line-chart-token.test.tsx (2 tests) 5ms
(node:91380) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/kpi-strip.test.tsx (4 tests) 259ms
(node:91381) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/delta.test.tsx (6 tests) 200ms
(node:91362) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:91371) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/week-view.test.tsx (4 tests) 588ms
   ✓ WeekView — grade semanal > tem 7 cabeçalhos de dia como botões e marca hoje com aria-current  381ms
 ✓ src/__tests__/period-overview.test.tsx (6 tests) 460ms
stderr | src/__tests__/project-detail-duedate.test.tsx > ProjectDetailPage — parse local de dueDate > renderiza a data do string sem deslocamento de fuso
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:91400) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/chart-ticks.test.ts (5 tests) 7ms
(node:91402) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/financial-summary.test.ts (6 tests) 7ms
(node:91364) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-detail-duedate.test.tsx (1 test) 263ms
(node:91365) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/dashboard-description.test.tsx (3 tests) 283ms

 Test Files  18 passed (18)
      Tests  69 passed (69)
   Start at  17:05:05
   Duration  11.01s (transform 2.05s, setup 8.16s, collect 25.85s, tests 14.32s, environment 29.78s, prepare 3.46s)


```
