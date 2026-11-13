```text

> vite_react_shadcn_ts@0.0.0 test:e2e
> playwright test

[WebServer] (node:75852) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 44 tests using 5 workers

(node:75868) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75864) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75865) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75866) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75867) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   3 [desktop] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (2.0s)
  ✓   1 [desktop] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (2.6s)
  ✓   2 [desktop] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (3.8s)
  ✓   5 [desktop] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo (4.2s)
  -   9 [desktop] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  -  10 [desktop] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal
  -  11 [desktop] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação
  ✓   7 [desktop] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (2.6s)
  ✓   4 [desktop] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (5.3s)
  -  12 [desktop] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow
  ✓   6 [desktop] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (3.3s)
  -  15 [desktop] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow
  -  17 [desktop] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet
  -  18 [desktop] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet
  ✓   8 [desktop] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (3.1s)
  ✓  13 [desktop] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (1.8s)
  ✓  14 [desktop] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (2.1s)
  -  21 [desktop] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola
(node:75964) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:75976) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  20 [desktop] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia (3.0s)
  ✓  23 [mobile] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (1.8s)
  ✓  19 [desktop] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (5.4s)
  ✓  24 [desktop] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página (1.6s)
(node:76016) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  16 [desktop] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (6.8s)
(node:76017) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  25 [mobile] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (2.0s)
  ✓  22 [mobile] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (4.5s)
(node:76028) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -  29 [mobile] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo
  -  31 [mobile] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓  27 [mobile] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (1.7s)
  ✓  32 [mobile] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal (1.4s)
  ✓  28 [mobile] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (2.7s)
  ✓  33 [mobile] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (1.7s)
  ✓  34 [mobile] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação (1.4s)
  ✓  35 [mobile] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola (1.7s)
  ✓  30 [mobile] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (3.9s)
  -  38 [mobile] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia
  -  40 [mobile] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página
  ✓  37 [mobile] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow (1.6s)
  ✓  41 [mobile] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow (1.2s)
  ✓  42 [mobile] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet (1.5s)
  ✓  26 [mobile] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (10.4s)
  ✓  43 [mobile] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet (2.5s)
  ✓  39 [mobile] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (5.7s)
  ✓  36 [mobile] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (7.5s)
  ✓  44 [mobile] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (11.4s)

  12 skipped
  32 passed (36.1s)

```
