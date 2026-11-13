```text

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.7 /Users/luisgosampaio/Documents/projects/Oriens/oriens-front

(node:85002) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:84998) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/task-chip.test.tsx (5 tests) 2825ms
   ✓ TaskChip — visão semanal > usa line-clamp e não parte palavras; prioridade é só um ponto com texto sr-only  399ms
   ✓ TaskChip — visão semanal > conclui pelo checkbox enviando o objeto inteiro  502ms
   ✓ TaskChip — visão semanal > menu marca a tarefa como em andamento  1052ms
   ✓ TaskChip — visão semanal > excluir só chama DELETE após a confirmação  825ms
(node:85005) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/task-row-status.test.tsx (6 tests) 3269ms
   ✓ TaskRow — ciclo de status (D9) > PENDING → CONCLUDED envia o objeto inteiro no PUT  863ms
   ✓ TaskRow — ciclo de status (D9) > menu marca como em andamento  939ms
   ✓ TaskRow — ciclo de status (D9) > menu volta uma tarefa em andamento para a fazer  445ms
   ✓ TaskRow — ciclo de status (D9) > excluir só chama DELETE após a confirmação  830ms
 ✓ src/__tests__/admin-mobile.test.tsx (2 tests) 2806ms
   ✓ admin mantém ações e badges em 390px com dados simulados  2071ms
   ✓ admin mantém ações e badges em 1440px com dados simulados  731ms
stderr | src/__tests__/projects-page-delete.test.tsx > ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:85012) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/project-detail-a9-dialogs.test.tsx > ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

 ✓ src/__tests__/entry-history-table.test.tsx (3 tests) 2244ms
   ✓ EntryHistoryTable — histórico independente do mês > alinha os valores à direita com sinal e tokens de cor  1094ms
   ✓ EntryHistoryTable — histórico independente do mês > usa Pagination com página atual e navegação  556ms
   ✓ EntryHistoryTable — histórico independente do mês > só exclui depois da confirmação  591ms
(node:85014) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/dashboard-description.test.tsx (3 tests) 1272ms
   ✓ DashboardPage — descrição do PageHeader > mostra concluídas, em andamento e a próxima tarefa  876ms
(node:85010) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:85013) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/dashboard-period-grouping.test.tsx (2 tests) 1417ms
   ✓ DashboardPage — agrupamento de tarefas por período > respeita as fronteiras 11:59:59/12:00:00 e 17:59:59/18:00:00  1166ms
 ✓ src/__tests__/projects-page-delete.test.tsx (2 tests) 2604ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar  2088ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE ao cancelar  514ms
(node:85008) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/form-validation.test.tsx > edição de tarefa mantém status e payload completo e mostra falha inline
Erro ao atualizar tarefa: Error: offline
    at /Users/luisgosampaio/Documents/projects/Oriens/oriens-front/src/__tests__/form-validation.test.tsx:40:50
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26
    at file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)
    at runTest (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)
    at runSuite (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1729:8)
    at runFiles (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1787:3)
    at startTests (file:///Users/luisgosampaio/Documents/projects/Oriens/oriens-front/node_modules/@vitest/runner/dist/chunk-hooks.js:1820:3)

(node:85000) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/form-validation.test.tsx (6 tests) 2701ms
   ✓ nova tarefa associa os erros aos campos e impede envio inválido  1246ms
   ✓ edição de tarefa mantém status e payload completo e mostra falha inline  356ms
   ✓ BE6: 403 ao criar tag permanece no formulário sem perder os dados  568ms
 ✓ src/__tests__/project-detail-a9-dialogs.test.tsx (2 tests) 2908ms
   ✓ ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **  1725ms
   ✓ ProjectDetailPage — A9 diálogos > não tem botão vazio absoluto e oferece 'Limpar data' dentro do PopoverContent  1118ms
(node:85104) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/day-line-motion.test.tsx (2 tests) 448ms
   ✓ linha do dia respeita reduced-motion=false ao rolar até a tarefa  349ms
(node:85088) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/project-card-objective-index.test.tsx > ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:85090) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/period-overview.test.tsx (6 tests) 588ms
 ✓ src/__tests__/project-card-objective-index.test.tsx (4 tests) 907ms
   ✓ ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)  613ms
(node:85132) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/kpi-strip.test.tsx (4 tests) 326ms
(node:85147) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/delta.test.tsx (6 tests) 266ms
(node:85159) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/chart-ticks.test.ts (5 tests) 11ms
(node:85158) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/financial-summary.test.ts (6 tests) 7ms
(node:85124) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/week-view.test.tsx (4 tests) 360ms
(node:85174) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/reusable-line-chart-token.test.tsx (2 tests) 5ms
stderr | src/__tests__/project-detail-duedate.test.tsx > ProjectDetailPage — parse local de dueDate > renderiza a data do string sem deslocamento de fuso
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:85148) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-detail-duedate.test.tsx (1 test) 214ms

 Test Files  19 passed (19)
      Tests  71 passed (71)
   Start at  16:56:18
   Duration  16.39s (transform 2.54s, setup 8.49s, collect 43.27s, tests 25.18s, environment 38.40s, prepare 5.59s)


```
