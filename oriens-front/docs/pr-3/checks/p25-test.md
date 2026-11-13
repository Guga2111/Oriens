```text

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.7 /private/tmp/oriens-pr3/final-history/1d1ead3/oriens-front

(node:90021) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90023) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90024) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/task-chip.test.tsx (5 tests) 3957ms
   ✓ TaskChip — visão semanal > usa line-clamp e não parte palavras; prioridade é só um ponto com texto sr-only  1006ms
   ✓ TaskChip — visão semanal > conclui pelo checkbox enviando o objeto inteiro  932ms
   ✓ TaskChip — visão semanal > menu marca a tarefa como em andamento  1029ms
   ✓ TaskChip — visão semanal > excluir só chama DELETE após a confirmação  926ms
 ✓ src/__tests__/task-row-status.test.tsx (6 tests) 4418ms
   ✓ TaskRow — ciclo de status (D9) > PENDING → CONCLUDED envia o objeto inteiro no PUT  1416ms
   ✓ TaskRow — ciclo de status (D9) > ON_DOING → CONCLUDED e checkbox indeterminate com aria-checked=mixed  504ms
   ✓ TaskRow — ciclo de status (D9) > menu marca como em andamento  1083ms
   ✓ TaskRow — ciclo de status (D9) > menu volta uma tarefa em andamento para a fazer  619ms
   ✓ TaskRow — ciclo de status (D9) > excluir só chama DELETE após a confirmação  530ms
(node:90027) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/project-detail-a9-dialogs.test.tsx > ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

stderr | src/__tests__/projects-page-delete.test.tsx > ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

 ✓ src/__tests__/admin-mobile.test.tsx (2 tests) 3839ms
   ✓ admin mantém ações e badges em 390px com dados simulados  2656ms
   ✓ admin mantém ações e badges em 1440px com dados simulados  1181ms
 ✓ src/__tests__/entry-history-table.test.tsx (3 tests) 3126ms
   ✓ EntryHistoryTable — histórico independente do mês > alinha os valores à direita com sinal e tokens de cor  1609ms
   ✓ EntryHistoryTable — histórico independente do mês > usa Pagination com página atual e navegação  675ms
   ✓ EntryHistoryTable — histórico independente do mês > só exclui depois da confirmação  831ms
(node:90026) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90029) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90028) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/dashboard-description.test.tsx (3 tests) 2201ms
   ✓ DashboardPage — descrição do PageHeader > mostra concluídas, em andamento e a próxima tarefa  1354ms
   ✓ DashboardPage — descrição do PageHeader > mostra 'Tudo concluído' quando não há próxima tarefa  482ms
   ✓ DashboardPage — descrição do PageHeader > mostra 'Nenhuma tarefa' quando o dia está vazio  360ms
 ✓ src/__tests__/dashboard-period-grouping.test.tsx (2 tests) 2765ms
   ✓ DashboardPage — agrupamento de tarefas por período > respeita as fronteiras 11:59:59/12:00:00 e 17:59:59/18:00:00  1806ms
   ✓ DashboardPage — agrupamento de tarefas por período > mostra a contagem de concluídas por seção no formato N de M  957ms
 ✓ src/__tests__/projects-page-delete.test.tsx (2 tests) 4644ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar  3076ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE ao cancelar  1566ms
(node:90022) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90025) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/form-validation.test.tsx > edição de tarefa mantém status e payload completo e mostra falha inline
Erro ao atualizar tarefa: Error: offline
    at /private/tmp/oriens-pr3/final-history/1d1ead3/oriens-front/src/__tests__/form-validation.test.tsx:40:50
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)
    at runTest (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)
    at runSuite (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1729:8)
    at runFiles (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1787:3)
    at startTests (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1820:3)

 ✓ src/__tests__/project-detail-a9-dialogs.test.tsx (2 tests) 8311ms
   ✓ ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **  3324ms
   ✓ ProjectDetailPage — A9 diálogos > não tem botão vazio absoluto e oferece 'Limpar data' dentro do PopoverContent  4985ms
 ✓ src/__tests__/form-validation.test.tsx (6 tests) 8554ms
   ✓ nova tarefa associa os erros aos campos e impede envio inválido  2166ms
   ✓ edição de tarefa mantém status e payload completo e mostra falha inline  1135ms
   ✓ entrada create expõe validação inline de valor e tag  700ms
   ✓ entrada edit expõe validação inline de valor e tag  607ms
   ✓ projeto não envia título em branco e associa o erro inline  1229ms
   ✓ BE6: 403 ao criar tag permanece no formulário sem perder os dados  2713ms
(node:90272) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/chart-ticks.test.ts (5 tests) 50ms
stderr | src/__tests__/project-card-objective-index.test.tsx > ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:90223) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90246) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/kpi-strip.test.tsx (4 tests) 1360ms
   ✓ KpiStrip — SPEC §11.6/D12 > mostra os quatro KPIs com valor de 24 px e rótulo de 14 px  677ms
   ✓ KpiStrip — SPEC §11.6/D12 > exibe description e additionalDescription do backend sem alteração (D12)  407ms
(node:90224) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-card-objective-index.test.tsx (4 tests) 3179ms
   ✓ ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)  2240ms
   ✓ ProjectCard — endereçamento de objetivo pelo índice original > envia o índice original de um objetivo sem data (PATCH .../objective/3)  613ms
(node:90270) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/delta.test.tsx (6 tests) 1206ms
   ✓ Delta — A10 goodDirection > com goodDirection 'down', alta é ruim (cor negativa e seta para cima)  893ms
 ✓ src/__tests__/period-overview.test.tsx (6 tests) 2153ms
   ✓ PeriodOverview — resumo do mês > mostra saldo do mês, receitas, gastos e o acumulado  674ms
   ✓ PeriodOverview — resumo do mês > oculta os quatro valores ao mascarar  500ms
   ✓ PeriodOverview — resumo do mês > mostra Skeleton inline no acumulado enquanto o histórico carrega  384ms
   ✓ PeriodOverview — resumo do mês > usa Empty com as duas ações quando o mês não tem entradas  361ms
(node:90228) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:90310) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/financial-summary.test.ts (6 tests) 13ms
 ✓ src/__tests__/week-view.test.tsx (4 tests) 2548ms
   ✓ WeekView — grade semanal > tem 7 cabeçalhos de dia como botões e marca hoje com aria-current  1071ms
   ✓ WeekView — grade semanal > clicar no cabeçalho do dia leva à visão dia daquela data  682ms
   ✓ WeekView — grade semanal > mostra a tarefa do dia no chip e 'Sem tarefas' nos dias vazios  416ms
   ✓ WeekView — grade semanal > abaixo de 1024 vira agenda vertical com TaskRow (SPEC §11.2)  339ms
(node:90320) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/reusable-line-chart-token.test.tsx (2 tests) 67ms
stderr | src/__tests__/project-detail-duedate.test.tsx > ProjectDetailPage — parse local de dueDate > renderiza a data do string sem deslocamento de fuso
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:90271) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-detail-duedate.test.tsx (1 test) 2272ms
   ✓ ProjectDetailPage — parse local de dueDate > renderiza a data do string sem deslocamento de fuso  2265ms

 Test Files  18 passed (18)
      Tests  69 passed (69)
   Start at  17:03:02
   Duration  47.79s (transform 7.77s, setup 24.58s, collect 97.02s, tests 54.66s, environment 107.02s, prepare 13.97s)


```
