```text

> vite_react_shadcn_ts@0.0.0 test:e2e
> playwright test

[WebServer] (node:76626) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 48 tests using 5 workers

(node:76650) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76648) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76649) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76651) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76647) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓   1 [desktop] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (4.8s)
  ✓   3 [desktop] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (6.1s)
  ✓   2 [desktop] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (6.3s)
  ✓   5 [desktop] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo (7.1s)
  -   9 [desktop] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  -  10 [desktop] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal
  -  11 [desktop] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação
  -  12 [desktop] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow
  ✓   4 [desktop] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (9.5s)
  -  13 [desktop] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow
  -  15 [desktop] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet
  -  16 [desktop] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet
  ✓   7 [desktop] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (5.5s)
  ✓   6 [desktop] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (7.9s)
  ✓   8 [desktop] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (6.5s)
  ✓  14 [desktop] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (8.5s)
  -  21 [desktop] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola
  ✓  18 [desktop] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (9.3s)
  ✓  19 [desktop] › e2e/support.spec.ts:6:1 › a FAQ de compartilhamento está marcada como Em breve (8.2s)
  ✓  22 [desktop] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia (7.6s)
  ✓  23 [desktop] › e2e/support.spec.ts:24:1 › o formulário de contato mostra os erros inline (5.8s)
(node:76842) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  20 [desktop] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (15.9s)
  ✓  24 [desktop] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página (2.6s)
(node:76913) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76923) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76938) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  17 [desktop] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (21.5s)
  ✓  26 [mobile] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (2.7s)
  ✓  25 [mobile] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (6.9s)
(node:76974) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -  29 [mobile] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo
  -  31 [mobile] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓  27 [mobile] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (3.8s)
  ✓  28 [mobile] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (6.1s)
  ✓  32 [mobile] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal (4.7s)
  ✓  33 [mobile] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (4.8s)
  ✓  30 [mobile] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (5.3s)
  ✓  36 [mobile] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação (3.6s)
  ✓  37 [mobile] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (6.5s)
  ✓  38 [mobile] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola (6.8s)
  ✓  34 [mobile] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (11.2s)
  ✓  39 [mobile] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow (4.5s)
  ✓  40 [mobile] › e2e/support.spec.ts:6:1 › a FAQ de compartilhamento está marcada como Em breve (8.3s)
  ✓  43 [mobile] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow (9.1s)
  ✓  42 [mobile] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (17.4s)
  -  46 [mobile] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia
  ✓  44 [mobile] › e2e/support.spec.ts:24:1 › o formulário de contato mostra os erros inline (11.7s)
  -  47 [mobile] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página
  ✓  45 [mobile] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet (12.4s)
  ✓  41 [mobile] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (26.9s)
  ✓  35 [mobile] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (37.4s)
  ✓  48 [mobile] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet (7.2s)

  12 skipped
  36 passed (1.4m)

```
