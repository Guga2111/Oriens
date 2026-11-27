# Catálogo de tokens do Oriens

Use com o [guia do design system](design-tokens.md) e os
[exemplos de composição](design-system-examples.md). As cores abaixo estão no
formato HSL `H S% L%` do [CSS global](../../../apps/client/src/index.css).
Os nomes das classes vêm da [configuração Tailwind](../../../apps/client/tailwind.config.ts).
Use os nomes de classe na UI e consulte o CSS para os valores e aliases.

## Superfícies, ação e foco

| Papel | Classes | Claro | Escuro |
|---|---|---|---|
| Fundo e texto | `bg-background text-foreground` | `240 4% 95%` / `240 3% 6%` | `240 3% 6%` / `200 6% 90%` |
| Cartão | `bg-card text-card-foreground` | `0 0% 100%` / `foreground` | `240 2% 8%` / `foreground` |
| Popover | `bg-popover text-popover-foreground` | `card` / `foreground` | `card` / `foreground` |
| Ação primária | `bg-primary text-primary-foreground` | `21 100% 38%` / `0 0% 100%` | `24 100% 55%` / `240 3% 6%` |
| Ação secundária | `bg-secondary text-secondary-foreground` | `210 5% 92%` / `foreground` | `200 4% 14%` / `foreground` |
| Apoio e metadados | `bg-muted text-muted-foreground` | `210 5% 92%` / `206 5% 30%` | `200 4% 14%` / `206 5% 70%` |
| Realce interativo | `bg-accent text-accent-foreground` | `210 5% 92%` / `foreground` | `200 4% 14%` / `foreground` |
| Ação destrutiva | `bg-destructive text-destructive-foreground` | `negative` / `0 0% 100%` | `negative` / `0 0% 98%` |
| Divisor e campo | `border-border` / `border-input` | `210 3% 89%` / `204 5% 80%` | `210 4% 18%` / `204 3% 28%` |
| Foco | `ring-ring` | `primary` | `primary` |

A barra lateral usa `bg-sidebar` e `text-sidebar-foreground`, que
apontam para `card` e `foreground` nos dois temas. A seleção usa
`bg-sidebar-accent` e `text-sidebar-accent-foreground` (`muted` e
`foreground`). O hover usa `bg-sidebar-hover` (`210 5% 96%` no claro e
`200 4% 11%` no escuro). `sidebar-primary`,
`sidebar-primary-foreground`, `sidebar-border` e `sidebar-ring`
herdam os tokens correspondentes.

Confira o par de cores no estado em que aparece. Por exemplo, o texto sobre
o fundo primário tem contraste de 5,11:1 no claro e 7,15:1 no escuro. O par
`destructive-foreground` sobre `destructive` tem 2,49:1 no escuro e fica
abaixo do contraste AA para texto. Confira os [critérios de acessibilidade](tests.md)
ao escolher uma composição.

## Cores de domínio

| Papel | Classes ou tokens | Uso |
|---|---|---|
| Valores de finanças | `text-positive`, `text-negative` | Receitas e despesas, com significado também no rótulo ou sinal |
| Sequência de atividade | `text-streak` | Realce de sequência em estatísticas |
| Agora | `text-now` | Indicador de tempo atual |
| Prioridade de tarefa | `text-priority-urgent`, `text-priority-high`, `text-priority-medium`, `text-priority-low` | Ícones de prioridade com nome acessível |
| Estado de tarefa | `text-state-started`, `text-state-completed`, `text-state-cancelled` | Ícones de estado com nome acessível |
| Etiquetas de tarefa | `bg-label-<cor>`, `text-label-<cor>-foreground`, `bg-label-<cor>-dot` | Paleta fechada `red`, `orange`, `yellow`, `green`, `blue`, `gray` |
| Séries de gráficos | `--chart-1` a `--chart-5` | Cores temáticas para `ChartConfig`; `--chart-1` é um alias de `--primary` |
| Descrição rica | `--description-ink-*`, `--description-highlight-*`, `--description-diagram-surface` | Variáveis do CSS do editor para texto, marcação e fundo dos diagramas |

| Token | Claro | Escuro |
|---|---|---|
| `positive` | `158 52% 26%` | `152 45% 62%` |
| `negative` | `6 72% 40%` | `6 85% 70%` |
| `streak` | `0 72% 40%` | `0 90% 78%` |
| `now` | `38 92% 30%` | `45.7 99.2% 52%` |

Cada cor de etiqueta tem fundo, texto e ponto próprios no claro e no escuro.
Use `TaskLabelBadge` para aproveitar o mapeamento entre a cor de domínio e a
variante do shadcn. O nome da etiqueta acompanha a cor. Veja
[`task-labels.ts`](../../../apps/client/src/lib/task-labels.ts) e
[`TaskLabels.tsx`](../../../apps/client/src/components/tasks/TaskLabels.tsx).

Passe cores de série como `hsl(var(--chart-1))` ao
[`ChartConfig`](../../../apps/client/src/components/ui/chart.tsx), como em
[`MonthFlowChart`](../../../apps/client/src/components/financial/MonthFlowChart.tsx).
As variáveis de descrição são consumidas pelo
[CSS do editor](../../../apps/client/src/components/tasks/description/task-description.css).

## Tipografia e elevação

| Classe | Valor ou papel |
|---|---|
| `font-sans` | Inter com fallback sans do Tailwind |
| `text-page-title` | `1.75rem` / `2.25rem`. `PageHeader` aplica em `md` e acima |
| `text-sm` | Escala Tailwind de `0.875rem` / `1.25rem`, comum em controles |
| `text-2xs` | `0.6875rem` / `1rem` para metadados compactos |
| `font-medium`, `font-semibold`, `tabular-nums` | Peso de 500 ou 600 e alinhamento de numerais |
| `rounded-lg`, `rounded-md`, `rounded-sm` | `--radius` de `0.5rem`, com reduções de 2 px e 4 px para `md` e `sm` |
| `shadow-sm`, `shadow-md`, `shadow-lg` | Escala Tailwind usada por `Card`, `PopoverContent` e `DialogContent`, respectivamente |
| `shadow-sheet` | Sombra do `Sheet` à direita. Alfa de 0,2 no claro e 0,4 no escuro |

## Geometria

A escala comum de espaçamento é a do Tailwind, como `gap-3` (0,75 rem)
e `p-4` (1 rem). Os tokens abaixo atendem à geometria compartilhada.

| Classes | Valor ou papel |
|---|---|
| `px-page`, `p-overlay`, `px-overlay` | Recuos de 1 rem. A partir de 768 px, página usa 1,25 rem e sobreposição usa 2 rem |
| `h-app-header`, `h-top-bar`, `w-rail` | Cabeçalho de 3 rem, barra superior de 2,5 rem, trilho de contextos de 3,75 rem |
| `w-mobile-navigation` | 16 rem mais a largura do trilho |
| `max-h-dialog` | Limite de 90 dvh para preservar a rolagem dentro da sobreposição |
| `max-w-task-dialog`, `max-w-project-dialog`, `max-w-board-dialog` | Limites de 40 rem, 35 rem e 42,5 rem |
| `w-popover-trigger` | Largura do gatilho fornecida pelo Radix |
| `w-board-column`, `aspect-project-cover` | Coluna de 21 rem e proporção de capa 3:1 |
| `grid-cols-project-detail`, `grid-cols-task-details` | Conteúdo flexível e painel de 20 rem no projeto. Coluna de 9 rem e conteúdo flexível na tarefa |
| `grid-cols-timeline-{week,fortnight,month}` | Coluna de rótulos e uma coluna por dia, na largura definida pela escala |
| `grid-cols-objective-timeline-{week,month,quarter}` | Coluna de objetivos e uma coluna por dia, na largura definida pela escala |
| `desktop:` | Breakpoint de 1100 px para o layout do app |
