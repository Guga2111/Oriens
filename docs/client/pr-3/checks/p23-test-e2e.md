```text

> vite_react_shadcn_ts@0.0.0 test:e2e
> playwright test

[WebServer] (node:83971) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 52 tests using 5 workers

(node:83990) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:83993) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:83994) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:83991) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:83992) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -   1 [desktop] › e2e/admin.spec.ts:19:1 › admin: a tela de suporte usa KpiStrip e tabela com mailto real
  -   6 [desktop] › e2e/admin.spec.ts:51:1 › admin: a tela de permissões mostra os papéis com badges
  ✓   3 [desktop] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (4.0s)
  ✓   2 [desktop] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (4.8s)
  ✓   7 [desktop] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (7.0s)
  ✓   5 [desktop] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo (7.8s)
  -  11 [desktop] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  -  12 [desktop] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal
  -  13 [desktop] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação
  ✓   4 [desktop] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (9.4s)
  -  14 [desktop] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow
  -  16 [desktop] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow
  ✓   9 [desktop] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (5.1s)
  -  17 [desktop] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet
  ✓   8 [desktop] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (6.1s)
  -  19 [desktop] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet
  ✓  10 [desktop] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (4.4s)
  ✓  15 [desktop] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (6.7s)
  -  23 [desktop] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola
  ✓  18 [desktop] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (8.4s)
  ✓  21 [desktop] › e2e/support.spec.ts:6:1 › a FAQ de compartilhamento está marcada como Em breve (9.5s)
  ✓  24 [desktop] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia (9.1s)
  ✓  25 [desktop] › e2e/support.spec.ts:24:1 › o formulário de contato mostra os erros inline (7.5s)
(node:84157) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -  27 [mobile] › e2e/admin.spec.ts:19:1 › admin: a tela de suporte usa KpiStrip e tabela com mailto real
  -  28 [mobile] › e2e/admin.spec.ts:51:1 › admin: a tela de permissões mostra os papéis com badges
  ✓  22 [desktop] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (18.0s)
  ✓  26 [desktop] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página (3.3s)
(node:84241) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  29 [mobile] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (2.0s)
  ✓  20 [desktop] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (22.3s)
(node:84270) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:84272) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:84291) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -  33 [mobile] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo
  -  35 [mobile] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓  32 [mobile] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (3.1s)
  ✓  36 [mobile] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal (3.8s)
  ✓  30 [mobile] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (7.1s)
  ✓  37 [mobile] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (5.1s)
  ✓  31 [mobile] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (9.5s)
  ✓  34 [mobile] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (6.2s)
  ✓  38 [mobile] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação (3.6s)
  ✓  39 [mobile] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (5.8s)
  ✓  40 [mobile] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (4.4s)
  ✓  43 [mobile] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow (3.1s)
  ✓  44 [mobile] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola (3.8s)
  ✓  45 [mobile] › e2e/support.spec.ts:6:1 › a FAQ de compartilhamento está marcada como Em breve (4.0s)
  ✓  46 [mobile] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow (3.7s)
  ✓  41 [mobile] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (11.6s)
  -  50 [mobile] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia
  -  51 [mobile] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página
  ✓  48 [mobile] › e2e/support.spec.ts:24:1 › o formulário de contato mostra os erros inline (5.1s)
  ✓  49 [mobile] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet (5.2s)
  ✓  52 [mobile] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet (5.4s)
  ✓  47 [mobile] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (11.9s)
  ✓  42 [mobile] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (19.5s)

  16 skipped
  36 passed (1.1m)

```
