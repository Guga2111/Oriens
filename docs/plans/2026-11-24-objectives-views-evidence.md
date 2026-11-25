# Objetivos — visões Lista, Galeria e Timeline: evidência

Design: [2026-11-24-objectives-views-design.md](2026-11-24-objectives-views-design.md). Data: 24/11/2026.

## Entregue

- Backend: `V13__objective_favorite.sql` (`is_favorite boolean not null default false`); `Objective.favorite`;
  `PatchObjective.favorite` (null → 422); `ObjectiveView.favorite`; MCP `update_objective` aceita `favorite` e a
  saída do objetivo o inclui.
- Frontend: `ViewSwitcher` e `SegmentedControl` em `components/common` (o seletor de Itens de trabalho passou a usá-los;
  `WorkViewSwitcher` removido); `ObjectiveGallery`, `ObjectiveTimeline`, `ObjectiveActions`; regras puras em
  `lib/objective-timeline.ts` e `lib/objectives.ts`; rolagem até a data extraída para `hooks/useTimelineScroll.ts`
  (usada pelas duas timelines); `?layout=` e `?scale=` na URL.
- Tokens: `--timeline-day-quarter` e `--objective-timeline-sidebar-width` (aprovados). Nenhuma cor nova.

## Provas

- `./mvnw test` (H2, sem McpP2/P3/P4): passou.
- `scripts/postgres-tests.sh ObjectiveDetailsPostgresTest McpP2PostgresTest`: passou (pin com posse 404, null 422,
  versão 409; MCP grava e devolve `favorite`).
- `npm test`: 364 de 366. As 2 falhas (`app-header`, `today-header-actions`) vêm de `AppHeader.tsx` e
  `app-contexts.ts`, alterados fora desta entrega durante a sessão.
- Novos: `objective-timeline.test.ts` (duração, janela, rótulos, fixados, partes do progresso),
  `objective-views.test.tsx` (seletor, pin, galeria, timeline), teste de URL em `project-detail-timeline.test.tsx`.
- `npm run lint`: 0 erros. `npm run build`: ok.
- Visual (Chrome, dados de dev): galeria e timeline em desktop e 390px, temas claro e escuro; escalas semana e
  trimestre. Corrigidos na revisão: iniciais de dia truncadas (agora uma letra, como o Gantt) e rótulo de mês
  sobrepondo "Semana N".

## Não feito / diferenças conhecidas

- O container de dev local não tinha a `V13`; a revisão visual mostrou todos os objetivos desafixados. O pin foi
  provado nos testes, não na tela.
- As linhas da grade da timeline terminam na última linha; no plane.so vão até o fim da página. Exigiria altura total
  nos contêineres da página do projeto (afeta quadro e Gantt).
- Sem arrastar barras; sem responsável (lead) no card.
- Dívida vista: `update_objective` no MCP recusa alteração só de `description`/`startDate` ("Informe ao menos um
  campo"), porque a checagem lista só title, dueDate, status (e agora favorite).
