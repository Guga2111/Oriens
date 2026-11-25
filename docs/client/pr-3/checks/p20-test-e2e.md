```text

> vite_react_shadcn_ts@0.0.0 test:e2e
> playwright test

[WebServer] (node:75283) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 38 tests using 5 workers

(node:75307) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75306) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75308) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75305) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75309) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   1 [desktop] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (1.3s)
  -   6 [desktop] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal
  -   7 [desktop] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação
  -   8 [desktop] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow
  -   9 [desktop] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow
  -  10 [desktop] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet
  -  11 [desktop] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet
  ✓   5 [desktop] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo (2.8s)
  -  13 [desktop] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓   3 [desktop] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (3.0s)
  ✓   2 [desktop] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (3.4s)
  ✓   4 [desktop] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (4.1s)
  ✓  15 [desktop] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia (3.2s)
  ✓  17 [desktop] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (2.1s)
  -  19 [desktop] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola
  ✓  16 [desktop] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (3.4s)
(node:75390) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  18 [desktop] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página (1.5s)
(node:75391) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75395) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  12 [desktop] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (6.0s)
  ✓  14 [desktop] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (5.9s)
  -  22 [mobile] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo
  -  23 [mobile] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓  21 [mobile] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (1.5s)
(node:75414) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75413) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  24 [mobile] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal (1.1s)
  ✓  20 [mobile] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (3.6s)
  ✓  28 [mobile] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação (1.3s)
  ✓  30 [mobile] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow (1.3s)
  ✓  26 [mobile] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (3.3s)
  ✓  29 [mobile] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (2.5s)
  ✓  31 [mobile] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow (1.4s)
  ✓  33 [mobile] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola (1.4s)
  -  35 [mobile] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia
  -  36 [mobile] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página
  ✓  34 [mobile] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet (1.6s)
  ✓  25 [mobile] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (7.3s)
  ✓  37 [mobile] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet (2.2s)
  ✓  32 [mobile] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (5.3s)
  ✓  27 [mobile] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (10.6s)
  ✓  38 [mobile] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (10.9s)

  12 skipped
  26 passed (33.3s)

```
