# Sequência de atividade com chama vermelha

Desenho aprovado em [activity-streak-design](../../plans/2026-11-15-activity-streak-design.md).
O indicador compacto aparece junto ao resumo, sem um novo card. Usa Flame do
lucide-react, variante semântica `streak` do Badge e Popover local. O vermelho tem
tokens próprios nos dois temas e não reutiliza o estado destrutivo/negativo.

## Regra e dados

`GET /statistics/user/{userId}/streak`, autenticado e isolado por dono, retorna a
sequência atual de dias com tarefa atualmente concluída ou execução de hábito.
Uma união de datas no PostgreSQL elimina duplicidade entre registros e fontes;
uma função de janela identifica a sequência sem limitar a consulta a 366 dias.
Execuções são validadas pelo domínio na escrita, e frequência/arquivo/pausas
prospectivos preservam as execuções históricas válidas.

Hoje ativo estende a sequência. Hoje sem atividade preserva a sequência que termina
ontem; outro dia sem atividade a interrompe. Inclui fins de semana e usa o relógio
America/Recife. Datas futuras são excluídas. Filtros global/anual não mudam esse
indicador. As mutações de tarefa e hábito invalidam seu cache por usuário/dia;
financeiro não interfere. Reabrir/excluir tarefa ou desmarcar hábito recalcula.

Se o início toca ou ultrapassa o marco de cobertura, aparece “Pelo menos N dias
seguidos”. Sem cobertura para afirmar se houve interrupção ontem, a API retorna
`days: null` e a interface mostra “—”; zero confirmado aparece como “0 dias seguidos”.
Hábitos sem programação continuam fora da aderência; a sequência global mede
atividade em dias de calendário, não aderência individual.

## Verificações executadas em 15/11/2026

- Frontend: **127 testes em 27 arquivos passaram**; sete testes específicos do
  indicador cobrem singular, cobertura incompleta, hoje pendente, zero,
  indisponibilidade, carregamento e preservação após erro.
- `npx tsc -p tsconfig.app.json --noEmit`: passou. Corrigidos dois parâmetros
  `exact` inválidos no teste do seletor de datas, detectados por essa checagem.
- ESLint dos arquivos alterados: zero erros; um aviso preexistente do padrão
  `badgeVariants` exportado junto ao componente para Fast Refresh.
- Build de produção: `VITE_API_BASE_URL=/api npm run build` passou, com os avisos
  existentes de Browserslist, classe duration e tamanho do chunk.
- `test_statistics.py --browser`: migrações/preflight/rollback/seal e **26 testes
  Java executados passaram**; dois testes de navegador opcionais antigos de
  P5/labels continuam ignorados. StatisticsPostgresTest: 11/11, incluindo três
  novos testes com fonte combinada, deduplicação, mutações, isolamento, virada de
  dia Recife, fins de semana, sequência de 370 dias e histórico insuficiente.
- [Prova HTTP real](../statistics/live-browser-results.json) em PostgreSQL
  descartável: abertura por teclado, Escape/devolução de foco, independência do
  filtro, atualização por hábitos e toque em 390 px.
- [Prova sintética](../statistics/browser-results.json): os mesmos fluxos mais
  estados vazio e erro parcial. O teste aguarda a animação real de abertura do
  Popover antes de enviar Escape; não usa atraso fixo.
- `lint.mjs --app` no indicador: 0 FAIL/0 WARN.
- `inspect.mjs --app` no build de produção: [claro](light/report.json) 0 FAIL/0 WARN;
  [escuro](dark/report.json) 0 FAIL/1 WARN. Sem falha de contraste reportada.
- `git diff --check`: passou. Nenhuma nova dependência ou migração para o streak.

Não foi executada auditoria formal WCAG nem teste com leitor de tela. A prova
não alterou contas, bancos ou containers existentes; usa PostgreSQL próprio e
servidores sintéticos separados para capturas e mutações.

## Comparação e crítica visual

Mesmo conjunto sintético e relógio das capturas originais: três hábitos, tarefas
e lançamentos gerados pela [fixture](../statistics/fixture-server.mjs). O indicador
mostra nove dias consecutivos com evidências, não um valor fixado na interface.

| Tema | Antes | Depois |
|---|---|---|
| Claro | [1440](../statistics/after/light/desktop-fold.jpg) · [768](../statistics/after/light/tablet-fold.jpg) · [390](../statistics/after/light/mobile-fold.jpg) | [1440](light/desktop-fold.jpg) · [768](light/tablet-fold.jpg) · [390](light/mobile-fold.jpg) |
| Escuro | [1440](../statistics/after/dark/desktop-fold.jpg) · [768](../statistics/after/dark/tablet-fold.jpg) · [390](../statistics/after/dark/mobile-fold.jpg) | [1440](dark/desktop-fold.jpg) · [768](dark/tablet-fold.jpg) · [390](dark/mobile-fold.jpg) |

Todas as capturas listadas pelo inspector, inclusive as folhas `*-page-01.jpg`,
foram abertas. Direção mantida: achromatic-ledger, seed 1359349889, Inter e identidade
Oriens; sem redraw. `palette-cream` preserva a marca. Vermelho localizado é a
exceção estética solicitada para a sequência. O aviso de cor no celular escuro
vem principalmente do calendário com células táteis de 44px, sem decoração nova.

ROUND 1 — Seen in one second: período, atividade e sequência atual. Idea: celebrar
constância com evidência, sem substituir a distribuição anual. Live thing: painel
com regra/datas e atualização após mutações. Layout: resumo em linha, badge discreto,
calendário amplo e análises existentes. Scores: design 8, usability 8, creativity 7,
content 8 → 7,8. Caps: nenhum FAIL; fotografia/movimento não se aplicam a app screens.

Crítica de app screens: (1) calendário continua dominante; (2) bordas e larguras
preservadas; (3) vermelho apenas no novo dado, nunca sinônimo de erro; (4) nove dias
vêm da união de realizações, separados dos 27 dias ativos no período; (5) zero e
ausência são distintos; (6) legenda anual permanece coerente e o streak explica
sua unidade; (7) no celular o indicador quebra para a próxima linha, com alvo de
44px, sem aumentar a largura da página. Limites restantes: rolagem interna do
calendário/matriz e mais uma linha no resumo móvel; aceitos para legibilidade.

Referências consultadas: [Badge Radix](https://ui.shadcn.com/docs/components/radix/badge),
[Popover Radix](https://ui.shadcn.com/docs/components/radix/popover) e
[Button Radix](https://ui.shadcn.com/docs/components/radix/button). Usadas as APIs
dos componentes locais existentes, sem reinstalação ou atualização do registry.

O streak não exige nova migração, mas a API depende das migrações de Estatísticas
e etiquetas já documentadas e ainda pendentes no banco local. A atualização desse
container continua aguardando a confirmação de alvo solicitada anteriormente.
