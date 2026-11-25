# Objetivos — visões Lista, Galeria e Timeline

Status: aprovado pelo usuário em 24/11/2026. Referência: visões de Módulos do plane.so (prints enviados na conversa).

## Escopo aprovado

A página Objetivos ganha um seletor de visão no cabeçalho (Lista, Galeria, Timeline), como o de Itens de trabalho.
A timeline de tarefas em Itens de trabalho (Gantt agrupado por objetivo) não muda.

## Seletor

- Ícones `List`, `LayoutGrid` e `GanttChart` no cabeçalho, antes de Filtrar e Novo objetivo. No celular, um menu.
- Reaproveita `WorkViewSwitcher`, que passa a receber as visões e o rótulo; não há um segundo seletor.
- Estado na URL: `?tab=objectives&layout=gallery|timeline`; sem `layout` é a lista. O filtro de status vale nas três.

## Galeria

- Grade de 1 coluna no celular, 2 em `sm` e 3 em `xl`.
- Card: título; à direita `Info` (abre o painel lateral existente), `Pin` (fixar) e menu ⋯ (Editar, Excluir).
- Segunda linha: ícone de camadas + `x/y tarefas` (concluídas sobre não canceladas).
- Barra segmentada: concluídas (`state-completed`), em andamento (`state-started`) e restante (`muted-foreground`),
  sobre as não canceladas. "Em andamento" vem das tarefas do projeto já carregadas pela página.
- Chips de período e status reaproveitam `ObjectivePeriodPicker` e `ObjectiveStatusPicker`.
- Clicar no card leva a Itens de trabalho filtrados pelo objetivo (link esticado; botões internos acima dele).
- Sem responsável (lead): o domínio não tem membros.

## Timeline de objetivos

- Barra de ferramentas: contagem de objetivos, escala Semana / Mês / Trimestre, Hoje e tela cheia (`Maximize2`, Esc sai).
- Coluna fixa de 22rem (12rem no celular), token novo `--objective-timeline-sidebar-width`:
  cabeçalho "Objetivos | Duração"; linhas com ícone de status, título e duração em dias inclusivos ("15 dias"; "—" sem período).
- Cabeçalho: semanas (mês/ano + "Semana N", ISO, início na segunda) e dias (inicial à esquerda, número à direita).
- Hoje: faixa vertical `now` translúcida e número do dia em pílula `now`.
- Uma barra por objetivo, cor pelo status com tokens translúcidos: em andamento `state-started`; backlog, planejado e
  pausado cinza; concluído `state-completed`; cancelado `state-cancelled`. Título fixo à esquerda quando a barra começa
  fora da tela. Uma única data vira barra de um dia. Linha com fundo `muted` no hover.
- Clicar na barra ou no título abre o painel lateral. Sem arrastar nesta entrega; datas se editam no painel.
- Reaproveita a lógica pura de `lib/timeline.ts`; nova escala `quarter` com token `--timeline-day-quarter`.

## Pin (favorito) de objetivo

- Mudança aditiva espelhando `Project.favorite`: migração `V13` com `is_favorite boolean not null default false`,
  `PatchObjective.favorite`, campo `favorite` na view do objetivo e no MCP (`update_objective` aceita; saída mostra).
- Na UI, apenas "Fixar/Desafixar" com o ícone `Pin` (preenchido em primário quando ativo) e `aria-pressed`.
- Fixados primeiro nas três visões, sem alterar `position`. Não vão para a sidebar; sem filtro de fixados.

## Restrições

Sem nova dependência; componentes shadcn existentes; só tokens (dois tokens de espaçamento novos aprovados:
`--timeline-day-quarter` e `--objective-timeline-sidebar-width`). Nenhuma cor, raio ou fonte nova. Estados de
carregando, vazio e erro; teclado e `aria-*` corretos. Textos em pt-BR, datas locais sem UTC.

## Provas

Backend: patch de `favorite` com posse (404 para outro usuário), versão e MCP. Frontend: seletor e URL, card da galeria
(link, pin, barra), timeline (posicionamento, duração, hoje, escala), ordenação de fixados. Lint, testes, build e revisão
visual desktop/celular nos dois temas.
