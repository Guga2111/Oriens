```text

> vite_react_shadcn_ts@0.0.0 test:e2e
> playwright test

[WebServer] (node:87875) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
[WebServer] Browserslist: browsers data (caniuse-lite) is 17 months old. Please run:
[WebServer]   npx update-browserslist-db@latest
[WebServer]   Why you should do it regularly: https://github.com/browserslist/update-db#readme

Running 58 tests using 5 workers

(node:87909) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:87907) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:87908) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:87911) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:87910) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -   3 [desktop] › e2e/admin.spec.ts:19:1 › admin: a tela de suporte usa KpiStrip e tabela com mailto real
  -   5 [desktop] › e2e/admin.spec.ts:51:1 › admin: a tela de permissões mostra os papéis com badges
  ✓   1 [desktop] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (3.5s)
  ✓   2 [desktop] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (7.1s)
  ✓   7 [desktop] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (8.2s)
  ✓   6 [desktop] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo (9.4s)
  -  11 [desktop] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓   4 [desktop] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (13.8s)
  ✓  12 [desktop] › e2e/public.spec.ts:5:1 › a landing tem um único CTA primário e a imagem do produto (4.5s)
  ✓   8 [desktop] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (12.0s)
  ✓   9 [desktop] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (8.9s)
  ✓  10 [desktop] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (9.1s)
  -  16 [desktop] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal
  -  18 [desktop] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação
  ✓  14 [desktop] › e2e/public.spec.ts:31:1 › a landing e o auth usam o logo em SVG (4.0s)
  -  19 [desktop] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow
  ✓  13 [desktop] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (5.7s)
  -  21 [desktop] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow
  -  22 [desktop] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola
  -  23 [desktop] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet
  -  25 [desktop] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet
  ✓  20 [desktop] › e2e/public.spec.ts:42:1 › a página 404 usa um Link tokenizado (2.5s)
  ✓  15 [desktop] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (7.3s)
  ✓  24 [desktop] › e2e/support.spec.ts:6:1 › a FAQ de compartilhamento está marcada como Em breve (5.5s)
  ✓  27 [desktop] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia (7.4s)
(node:88134) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  -  30 [mobile] › e2e/admin.spec.ts:19:1 › admin: a tela de suporte usa KpiStrip e tabela com mailto real
  ✓  28 [desktop] › e2e/support.spec.ts:24:1 › o formulário de contato mostra os erros inline (6.8s)
  -  31 [mobile] › e2e/admin.spec.ts:51:1 › admin: a tela de permissões mostra os papéis com badges
  ✓  29 [desktop] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página (4.6s)
  ✓  26 [desktop] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (16.5s)
  ✓  32 [mobile] › e2e/auth.spec.ts:4:1 › login com credenciais válidas leva ao Dashboard (3.8s)
(node:88211) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:88216) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  17 [desktop] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (20.6s)
(node:88250) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:88255) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  34 [mobile] › e2e/config.spec.ts:6:1 › configurações tem as quatro seções e o tema em ToggleGroup (4.8s)
  -  37 [mobile] › e2e/financial.spec.ts:85:1 › troca de mês atualiza os três blocos do resumo
  -  39 [mobile] › e2e/financial.spec.ts:130:6 › cria tag financeira (BE6)
  ✓  33 [mobile] › e2e/navigation.spec.ts:34:1 › navega por todos os itens da sidebar (8.8s)
  ✓  40 [mobile] › e2e/public.spec.ts:5:1 › a landing tem um único CTA primário e a imagem do produto (3.3s)
  ✓  38 [mobile] › e2e/config.spec.ts:31:1 › WhatsApp mostra apenas o estado, sem botão de conexão (6.0s)
  ✓  35 [mobile] › e2e/all-data.spec.ts:17:1 › abas e arquivados vivem na URL (10.8s)
  ✓  36 [mobile] › e2e/projects.spec.ts:5:1 › cria projeto com objetivo e alterna o objetivo (7.5s)
  ✓  42 [mobile] › e2e/public.spec.ts:31:1 › a landing e o auth usam o logo em SVG (4.6s)
  ✓  43 [mobile] › e2e/config.spec.ts:43:1 › o tema alterna entre claro e escuro (5.4s)
  ✓  46 [mobile] › e2e/public.spec.ts:42:1 › a página 404 usa um Link tokenizado (2.8s)
  ✓  45 [mobile] › e2e/responsive.spec.ts:69:1 › mobile: /tasks não tem rolagem horizontal (3.5s)
  ✓  44 [mobile] › e2e/all-data.spec.ts:56:1 › filtro de status inclui Em andamento (6.3s)
  ✓  41 [mobile] › e2e/navigation.spec.ts:72:1 › navega pela sidebar sem document request (Q-T1) (10.5s)
  ✓  49 [mobile] › e2e/responsive.spec.ts:81:1 › mobile: existe controle visível para abrir a navegação (3.5s)
  ✓  47 [mobile] › e2e/support.spec.ts:6:1 › a FAQ de compartilhamento está marcada como Em breve (4.4s)
  ✓  50 [mobile] › e2e/all-data.spec.ts:69:1 › no mobile a tabela vira lista e a página não rola (6.2s)
  -  54 [mobile] › e2e/week.spec.ts:23:1 › semana em 1440: cabeçalho do dia leva à visão dia
  -  55 [mobile] › e2e/week.spec.ts:53:1 › semana em 1024: a grade rola dentro do container, não a página
  ✓  52 [mobile] › e2e/responsive.spec.ts:95:1 › mobile: /tasks no dia mostra a linha do dia compacta sem overflow (4.8s)
  ✓  53 [mobile] › e2e/support.spec.ts:24:1 › o formulário de contato mostra os erros inline (6.0s)
  ✓  56 [mobile] › e2e/responsive.spec.ts:113:1 › mobile: /tasks na semana usa a agenda vertical sem overflow (3.1s)
  ✓  51 [mobile] › e2e/tasks.spec.ts:5:1 › cria, conclui e alterna o status de uma tarefa (12.1s)
  ✓  57 [mobile] › e2e/responsive.spec.ts:139:1 › mobile: /financial não tem rolagem horizontal e os filtros ficam no Sheet (3.7s)
  ✓  48 [mobile] › e2e/shell.spec.ts:18:1 › cada rota autenticada tem exatamente um h1 (15.9s)
  ✓  58 [mobile] › e2e/responsive.spec.ts:160:1 › mobile: /all-data vira lista e os filtros ficam no Sheet (5.0s)

  16 skipped
  42 passed (1.3m)

```
