```text

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.7 /private/tmp/oriens-pr3/final-history/a0126cf/oriens-front

(node:85001) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:84997) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:85011) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/period-overview.test.tsx (6 tests) 1377ms
   ✓ PeriodOverview — resumo do mês > mostra saldo do mês, receitas, gastos e o acumulado  445ms
   ✓ PeriodOverview — resumo do mês > oculta os quatro valores ao mascarar  600ms
(node:85003) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/task-chip.test.tsx (5 tests) 2498ms
   ✓ TaskChip — visão semanal > usa line-clamp e não parte palavras; prioridade é só um ponto com texto sr-only  388ms
   ✓ TaskChip — visão semanal > conclui pelo checkbox enviando o objeto inteiro  391ms
   ✓ TaskChip — visão semanal > ON_DOING usa checkbox indeterminate  313ms
   ✓ TaskChip — visão semanal > menu marca a tarefa como em andamento  655ms
   ✓ TaskChip — visão semanal > excluir só chama DELETE após a confirmação  749ms
 ✓ src/__tests__/admin-mobile.test.tsx (2 tests) 2966ms
   ✓ admin mantém ações e badges em 390px com dados simulados  1957ms
   ✓ admin mantém ações e badges em 1440px com dados simulados  1006ms
(node:85006) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | src/__tests__/projects-page-delete.test.tsx > ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

 ✓ src/__tests__/task-row-status.test.tsx (6 tests) 3520ms
   ✓ TaskRow — ciclo de status (D9) > PENDING → CONCLUDED envia o objeto inteiro no PUT  1041ms
   ✓ TaskRow — ciclo de status (D9) > CONCLUDED → PENDING ao desmarcar  304ms
   ✓ TaskRow — ciclo de status (D9) > menu marca como em andamento  847ms
   ✓ TaskRow — ciclo de status (D9) > menu volta uma tarefa em andamento para a fazer  409ms
   ✓ TaskRow — ciclo de status (D9) > excluir só chama DELETE após a confirmação  625ms
stderr | src/__tests__/project-detail-a9-dialogs.test.tsx > ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

 ✓ src/__tests__/entry-history-table.test.tsx (3 tests) 2393ms
   ✓ EntryHistoryTable — histórico independente do mês > alinha os valores à direita com sinal e tokens de cor  1337ms
   ✓ EntryHistoryTable — histórico independente do mês > usa Pagination com página atual e navegação  484ms
   ✓ EntryHistoryTable — histórico independente do mês > só exclui depois da confirmação  568ms
(node:85004) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:85009) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:85007) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/dashboard-description.test.tsx (3 tests) 1127ms
   ✓ DashboardPage — descrição do PageHeader > mostra concluídas, em andamento e a próxima tarefa  783ms
 ✓ src/__tests__/projects-page-delete.test.tsx (2 tests) 2530ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE antes da confirmação e chama após confirmar  1912ms
   ✓ ProjectsPage — AlertDialog de excluir projeto > não chama DELETE ao cancelar  616ms
 ✓ src/__tests__/dashboard-period-grouping.test.tsx (2 tests) 1336ms
   ✓ DashboardPage — agrupamento de tarefas por período > respeita as fronteiras 11:59:59/12:00:00 e 17:59:59/18:00:00  1080ms
(node:84999) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-detail-a9-dialogs.test.tsx (2 tests) 2765ms
   ✓ ProjectDetailPage — A9 diálogos > exibe o título do projeto em <strong> na confirmação de exclusão, sem **  1598ms
   ✓ ProjectDetailPage — A9 diálogos > não tem botão vazio absoluto e oferece 'Limpar data' dentro do PopoverContent  1156ms
(node:85105) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/kpi-strip.test.tsx (4 tests) 308ms
(node:85122) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/delta.test.tsx (6 tests) 276ms
stderr | src/__tests__/project-card-objective-index.test.tsx > ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:85083) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:85146) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/financial-summary.test.ts (6 tests) 7ms
 ✓ src/__tests__/project-card-objective-index.test.tsx (4 tests) 812ms
   ✓ ProjectCard — endereçamento de objetivo pelo índice original > ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)  657ms
(node:85149) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/chart-ticks.test.ts (5 tests) 16ms
(node:85150) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/reusable-line-chart-token.test.tsx (2 tests) 5ms
(node:85089) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/week-view.test.tsx (4 tests) 790ms
   ✓ WeekView — grade semanal > tem 7 cabeçalhos de dia como botões e marca hoje com aria-current  453ms
stderr | src/__tests__/project-detail-duedate.test.tsx > ProjectDetailPage — parse local de dueDate > renderiza a data do string sem deslocamento de fuso
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

(node:85118) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
(Use `node --trace-warnings ...` to show where the warning was created)
 ✓ src/__tests__/project-detail-duedate.test.tsx (1 test) 232ms

 Test Files  17 passed (17)
      Tests  63 passed (63)
   Start at  16:56:18
   Duration  16.05s (transform 2.54s, setup 8.44s, collect 39.63s, tests 22.96s, environment 35.95s, prepare 5.51s)


```
