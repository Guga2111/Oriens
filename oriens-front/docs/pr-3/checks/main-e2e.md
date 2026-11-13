```text

> vite_react_shadcn_ts@0.0.0 test:e2e
> playwright test

[WebServer] (node:73050) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] Browserslist: browsers data (caniuse-lite) is 17 months old. Please run:
[WebServer]   npx update-browserslist-db@latest
[WebServer]   Why you should do it regularly: https://github.com/browserslist/update-db#readme

Running 30 tests using 5 workers

(node:73066) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:73064) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:73063) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:73067) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:73065) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   3 [desktop] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (1.4s)
  -   6 [desktop] › e2e/responsive.spec.ts:7:1 › mobile: /tasks não tem rolagem horizontal
  -   7 [desktop] › e2e/responsive.spec.ts:21:1 › mobile: existe controle visível para abrir a navegação
  ✓   1 [desktop] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (2.6s)
  ✓   5 [desktop] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo (2.6s)
  -  10 [desktop] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓   2 [desktop] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (3.3s)
  ✓   4 [desktop] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (3.6s)
  ✓  13 [desktop] › e2e/all-data.spec.ts:52:1 › filtro de status inclui Em andamento (2.8s)
  ✓  11 [desktop] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia (3.4s)
  -  14 [desktop] › e2e/all-data.spec.ts:63:1 › tabela rola dentro do container no mobile
  ✓  12 [desktop] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (3.8s)
(node:73135) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  15 [desktop] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página (1.6s)
(node:73136) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   9 [desktop] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (6.6s)
(node:73147) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   8 [desktop] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (7.9s)
(node:73158) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -  18 [mobile] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo
  -  20 [mobile] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
(node:73164) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  17 [mobile] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (1.8s)
  ✓  21 [mobile] › e2e/responsive.spec.ts:7:1 › mobile: /tasks não tem rolagem horizontal (1.6s)
  ✓  16 [mobile] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (3.3s)
  ✓  24 [mobile] › e2e/responsive.spec.ts:21:1 › mobile: existe controle visível para abrir a navegação (1.4s)
  ✓  23 [mobile] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (3.0s)
  -  27 [mobile] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia
  -  28 [mobile] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página
  ✓  25 [mobile] › e2e/all-data.spec.ts:52:1 › filtro de status inclui Em andamento (2.3s)
  ✓  29 [mobile] › e2e/all-data.spec.ts:63:1 › tabela rola dentro do container no mobile (2.2s)
  ✓  26 [mobile] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (5.4s)
  ✓  22 [mobile] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (8.1s)
  ✓  19 [mobile] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (10.3s)
  ✓  30 [mobile] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (10.9s)

  8 skipped
  22 passed (32.7s)

```
