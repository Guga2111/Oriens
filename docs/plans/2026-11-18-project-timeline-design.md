# Timeline de projetos de desenvolvimento (Gantt)

- **Status:** design aprovado em 17/11/2026, com as quatro seções aprovadas. Implementar só nas tasks 26 a 30.
- **Origem:** task 25 do projeto Oriens, objetivo 14 "Projetos de desenvolvimento: visão de timeline (Gantt)".
  A task foi lida pelo MCP do Oriens (`oriens_get_task`, `oriens_get_board`).
- **Fluxo:** o do AGENTS.md (design → aprovação → implementação → evidência), conduzido com a skill
  `brainstorming-skill` (explorar → perguntas → abordagens → design por seções → documento).

## 1. Problema

O quadro kanban mostra **onde** cada tarefa está, mas não **quando**. Em um projeto de desenvolvimento,
com objetivos que têm prazo, falta uma visão temporal que responda três perguntas: o que está planejado
para os próximos dias, que entrega fecha quando e o que já passou do prazo.

## 2. Decisões já tomadas

| Tema | Decisão | Origem |
|---|---|---|
| Intervalo da barra | Começa em `plannedDate` e termina em `dueDate`. Não haverá `start_date` nem migração. | Task 25 (17/11) |
| Linhas | Cada objetivo é um grupo recolhível com barra-resumo; as tarefas ficam abaixo; "Sem objetivo" vem por último | Pergunta 2 |
| Navegação no tempo | Três escalas (Semana, 2 semanas, Mês) com scroll horizontal dentro de uma janela | Pergunta 3 |
| Estado na barra | O preenchimento indica o estado; o atraso fica destacado em `negative` | Pergunta 4 |
| Contrato | O board ganha a janela `startDate`/`endDate` (aditiva). Não haverá endpoint novo. | Pergunta 1 |
| MCP | `oriens_get_board` espelha a janela já na v1 | Pergunta 5 |
| Tarefa sem data | Entra sempre, porque não tem posição no tempo e a janela não pode excluí-la | Pergunta 6 |
| Renderização | CSS Grid por dia, implementação própria. Nenhuma lib de Gantt (§3). | Pergunta 7 |
| Interação | Clicar na barra abre o `TaskDetailsDialog` existente. Arrastar para mudar datas fica fora da v1. | Task 25 |

## 3. Por que não usar uma biblioteca de Gantt

O critério do usuário: adotar uma lib pronta **se** ela se integrar ao Tailwind e ao shadcn sem causar bugs;
havendo conflito, usar CSS Grid. As candidatas foram avaliadas contra a stack atual (React 18.3,
Tailwind 3.4, date-fns 3, shadcn `default` sobre Radix):

| Lib | Conflitos encontrados |
|---|---|
| **Kibo UI Gantt** (MIT, `npx kibo-ui add gantt`, também publicada em shadcn.io/r/gantt) | <ul><li>Adiciona 5 dependências: `jotai`, `@uidotdev/usehooks`, `lodash.throttle`, `@dnd-kit/modifiers` e `date-fns@4`, uma major acima da nossa.</li><li>`GanttToday` usa `new Date()` fixado na montagem e o texto "Today" hardcoded, o que fura `useProductToday` e o fuso America/Recife.</li><li>As features são copiadas para `useState` uma única vez, então as atualizações do cache do TanStack Query não chegam às barras.</li><li>*Stale closure* no scroll infinito (`useCallback(throttle(…), [])`).</li><li>Listeners globais de mouse e scroll por coluna, e átomos jotai globais compartilhados entre instâncias.</li><li>Não há clique na barra.</li><li>A11y insuficiente: `div role="button"` só com Enter, botões de ícone sem `aria-label`, arrasto só com mouse.</li><li>Usa o token `bg-backdrop`, que não existe no Oriens.</li></ul> |
| **ReUI Gantt** (`@reui/gantt`) | Exige Tailwind v4 e React 19. O Gantt aparenta ser um bloco pago. |
| **shadcn.io `timeline-gantt-inspired`** | Bloco Pro sobre Base UI; o Oriens usa Radix. Já tinha sido descartado na task 25. |
| SVAR, frappe-gantt, gantt-task-react | CSS e SVG próprios, fora dos tokens (regra 7). O gantt-task-react está sem manutenção. |

Adotar o Kibo exigiria corrigir quatro bugs e reescrever o a11y, o que transformaria o código em nosso
de qualquer forma, só que com dependências a mais. **Conclusão: CSS Grid.** Do Kibo aproveitamos apenas a
ideia de composição (Provider → cabeçalho, rótulos, linhas e hoje), não o código.

Fontes: [Kibo UI Gantt](https://www.kibo-ui.com/components/gantt) ·
[package.json do Kibo Gantt](https://github.com/shadcnblocks/kibo/blob/main/packages/gantt/package.json) ·
[ReUI Gantt](https://reui.io/components/gantt) · [ReUI get started](https://reui.io/docs/get-started)

## 4. Dados, API e MCP (task 26)

### 4.1 Contrato REST

`GET /project/{id}/board?startDate=AAAA-MM-DD&endDate=AAAA-MM-DD`

Os nomes são os mesmos de `oriens_list_tasks`. Os dois parâmetros são opcionais, e sem eles o
comportamento atual não muda.

> `startDate`/`endDate` são **limites da consulta** (o período exibido), e não campos da tarefa. A tarefa
> continua sem `start_date`: a barra vai de `plannedDate` a `dueDate` (decisão de 17/11). Os nomes foram
> mantidos para consistência com `oriens_list_tasks`.

- **Validação:** os dois vêm juntos ou nenhum vem, com `startDate ≤ endDate` e um vão de no máximo 366 dias.
  Fora disso a resposta é 400 `INVALID_REQUEST`, com `field` no parâmetro culpado (padrão de `WorkDomainException`).
- **Regra de inclusão:** `lo = min(plannedDate, dueDate)` e `hi = max(plannedDate, dueDate)`. Com uma
  data só, `lo = hi = essa data`. A tarefa entra quando `lo ≤ endDate && hi ≥ startDate`.
  **Uma tarefa sem nenhuma das duas datas entra sempre.**
- **Combinação:** a janela se combina com `objectiveId`, `planning`, `overdue` e `open` por AND e faz `filtered = true`.
- **Contagens:** `visible` e `columns[].visibleCount` refletem a janela, enquanto `total` continua sendo
  o do projeto. Assim, `total.totalTasks − visible.totalTasks` dá quantas tarefas ficaram fora do
  período, número usado no estado "janela vazia" (§6.2).
- **Segurança e desempenho:** nada muda no escopo. `WorkReadService.board` continua resolvendo o projeto
  pelo dono (outro usuário recebe 404). O filtro é aplicado em memória sobre a lista que já é
  carregada e projetada em lote por `views(owner, …)`, sem nova consulta e sem N+1. Não há mudança
  de schema.

### 4.2 MCP

- `oriens_get_board` ganha `startDate` e `endDate` (tipo `DATE`) com a mesma validação e a mesma regra
  de inclusão. A paginação de tarefas e colunas continua como está.
- A descrição da ferramenta no `McpWorkCatalog` passa a explicar a regra: "Janela por interseção do
  intervalo planejado–prazo; tarefas sem data sempre entram."
- O escopo continua `projects:read`, e linhas e contagens seguem exigindo `tasks:read`.
- Atualizar `McpWorkCatalog`, `McpWorkTools` (repasse dos argumentos) e `docs/mcp.md`.

### 4.3 Frontend: dados

- `BoardFilters` (`services/projectService.ts`) ganha `startDate?` e `endDate?`. `useProjectBoard(id, filters)`
  já põe os filtros na chave, e a invalidação existente de `projects/board` cobre a nova chave.
- A timeline usa `placeholderData` com a janela anterior, para não piscar ao trocar de escala ou de período.
- Os objetivos (título, `dueDate`, `status`, `position`) vêm de `useWorkProject(id)`, que já está em cache na página.

### 4.4 Consolidação: regra de atraso

A regra está duplicada em `ProjectBoard.tsx:134` e em `TaskDetailsDialog.tsx:95`. Ela será extraída para
`isTaskOverdue(task, today)` em `lib/` (aberta, ou seja `PENDING`/`ON_DOING`, com `dueDate < today`) e
usada pelos três consumidores. Trata-se de uma mudança de escopo mínimo, justificada porque a timeline
seria o terceiro lugar a repetir a regra.

### 4.5 Testes de backend

- A janela inclui a tarefa dentro do período, a que cruza a borda inicial, a que cruza a borda final, a invertida
  (`planned > due`), a que tem só uma data e a que não tem nenhuma.
- A janela exclui a tarefa inteiramente antes e a inteiramente depois.
- Validações: só um parâmetro, `startDate > endDate`, vão maior que 366 dias e data malformada dão 400.
- Projeto de outro usuário com janela dá 404.
- Paridade REST × MCP: o mesmo conjunto de tarefas para a mesma janela.

## 5. Anatomia visual (task 27)

Mantém a identidade "Horizonte" e os tokens atuais do Oriens. Não há estilo novo nem cor nova.

### 5.1 Barra de ferramentas

- `ToggleGroup` (single) com **Semana · 2 semanas · Mês**, guardado na URL em `?scale=week|fortnight|month`.
  O padrão é `fortnight`.
- Botão **Hoje**, que rola a grade até hoje e volta `anchor` para hoje.
- Botões de ícone ‹ ›, com `aria-label` "Período anterior" e "Próximo período", que deslocam
  `?anchor=AAAA-MM-DD` em metade do vão da escala e refazem a busca. Uma âncora inválida é ignorada e
  vale hoje.
- Um `Spinner` discreto enquanto `isFetching`.

### 5.2 Janela por escala

As semanas começam na segunda-feira (`weekStartsOn: 1`).

| Escala | Janela em torno da âncora | Largura do dia (token) | Passo de ‹ › |
|---|---|---|---|
| Semana | −2 a +6 semanas | `--timeline-day-week: 3rem` | 4 semanas |
| 2 semanas | −4 a +12 semanas | `--timeline-day-fortnight: 2rem` | 8 semanas |
| Mês | −2 a +6 meses (do início do mês) | `--timeline-day-month: 0.75rem` | 4 meses |

A janela calculada é enviada ao board como `startDate`/`endDate`, e todas cabem no limite de 366 dias.
Dentro dela, o scroll horizontal fica no `ScrollArea`.

### 5.3 Grade

- A coluna de rótulos é `sticky` (`--timeline-label-width: 16rem`, 9rem abaixo de 640px). A coluna de
  cada dia usa o token da escala.
- O cabeçalho tem dois níveis. Em cima, o mês por extenso em pt-BR (`date-fns/locale/ptBR`). Embaixo, o dia
  com a inicial da semana nas escalas Semana e 2 semanas, ou o início de cada semana ("17 nov") na escala Mês.
- Os fins de semana recebem um degrau de tom (`bg-muted`). Não há linhas de grade nem réguas finas.
- Os tokens novos são **só de medida** (`--timeline-label-width`, `--timeline-day-week`,
  `--timeline-day-fortnight`, `--timeline-day-month`), adicionados em `index.css` e mapeados em
  `tailwind.config.ts`, conforme frontend.md §3.3.
- A posição da barra é `style={{ gridColumn: \`${start} / span ${span}\` }}`, um valor dinâmico de runtime
  permitido pelo frontend.md §3.4.

### 5.4 Linhas e ordem

1. Objetivos na ordem de `position`, cada um como um grupo `Collapsible`. Os grupos com tarefas na janela
   começam abertos; os outros, fechados. O estado aberto ou fechado é local e não vai para a URL.
2. Por último, o grupo "Sem objetivo", presente quando há tarefas sem `objectiveId`.
3. Dentro do grupo, as tarefas são ordenadas por `lo` e depois por `position`.

A linha de tarefa tem `h-10` e a de objetivo `h-11`. Abaixo de 640px, todas têm `h-11` (alvo de toque).

### 5.5 Barras de tarefa

A barra tem `h-7` e `rounded-md`, centralizada na linha. Quando o título não cabe nela, a barra fica fina
(`h-4`), para que a barra de um dia não pareça um checkbox (revisão de 19/11).

| Estado | Aparência |
|---|---|
| Pendente | `bg-card text-foreground` com `border border-muted-foreground`, hover `bg-muted`. No tema claro, `secondary`, `muted` e `accent` têm o mesmo tom, então a barra pendente usa contorno sobre `card` para não se confundir com a concluída (revisão de 19/11). |
| Fazendo | `bg-primary text-primary-foreground` |
| Concluída | `bg-muted text-muted-foreground`, título riscado e ícone `Check`; hover `bg-muted-foreground/15` |
| Atrasada (`isTaskOverdue`) | Borda e texto em `negative`, com ícone `AlertTriangle`. Vale sobre o estado pendente ou fazendo. |
| Cancelada | Oculta, com o contador "N canceladas ocultas" na barra de ferramentas |

O título vai dentro da barra quando cabe; quando não cabe, fica à direita dela, fora da barra. O título interno
é `sticky` ao lado da coluna de rótulos, então continua visível quando o início da barra sai da tela. A largura
mínima visual é de um dia.

### 5.6 Casos de data

| Caso | Representação |
|---|---|
| `plannedDate` e `dueDate`, com `planned ≤ due` | Barra de `planned` a `due` |
| Só `plannedDate` | Barra de 1 dia |
| Só `dueDate` | Losango (`Diamond` do lucide, preenchido) no dia do prazo |
| Nenhuma | Seção **"Sem data"** abaixo da grade, em lista de botões com o badge de estado |
| `plannedDate > dueDate` | Barra de `due` a `planned` no estilo de atrasada, com a tooltip "Planejada para depois do prazo" |
| A barra cruza a borda da janela | Cortada na borda, com o canto daquele lado reto, sinal de que continua |

### 5.7 Linha do objetivo

- **Barra-resumo:** vai do menor `lo` ao maior `hi` das tarefas não canceladas do grupo. É fina (`h-2`),
  em `bg-accent`, com o preenchimento de progresso em `bg-primary`. A largura em % (dinâmica) é
  `completedTasks / nonCancelledTasks`, contagens que já vêm do projeto.
- **Prazo do objetivo:** losango no `dueDate`, em `text-primary`, ou `text-negative` se o objetivo estiver
  `PENDING` e vencido.
- **Rótulo:** título do objetivo e `x/y` em `tabular-nums`.

### 5.8 Marcador de hoje

Uma linha vertical de 2px em `bg-now` atravessa a grade, com o rótulo "Hoje" no cabeçalho em `text-now`. A data vem de
`useProductToday`, nunca de `new Date()`.

### 5.9 Referências de estilo (skills)

- **`awesome-design-md` → `linear.app`** como referência de densidade e contenção: um único acento, cor
  só no dado, superfícies planas e linhas densas. Nada do `DESIGN.md` é importado para o projeto, e os
  tokens do Oriens prevalecem.
- **`design-taste-frontend` → `references/app-screens.md`**: cor vai no dado e não no cromo, superfícies
  planas sem sombra, estados honestos (zero aparece como zero, vazio mantém a moldura), a tarefa mais
  frequente a um clique de distância.
- **`impeccable`**, modo *Operate*: escaneabilidade e consistência acima de expressão.

## 6. Interação, estados e acessibilidade (tasks 28 e 29)

### 6.1 Integração na página

- Nova aba **Timeline** em `ProjectDetailPage` (`?tab=timeline`), ao lado de Quadro e Objetivos, apenas
  para projetos `DEVELOPMENT`. O parser de `tab` passa a aceitar `timeline`.
- Os filtros do Quadro (objetivo, planejamento, prazo, abertas) **não** se aplicam à timeline na v1, porque
  ficam dentro da aba Quadro.
- Clicar na barra, no losango, no rótulo da tarefa ou num item de "Sem data" chama o `showTask` existente
  (`?task=ID`, com `replace`), que abre o `TaskDetailsDialog`. O deep link `?tab=timeline&task=25` funciona,
  e o `placeholder` do diálogo passa a procurar também nos dados da timeline.
- A tooltip (`Tooltip` do shadcn) aparece no hover e no foco, com o título, "Planejada 19 nov · Prazo 20 nov"
  (ou "Sem planejamento" / "Sem prazo") e o estado (`TASK_STATUS`).
- Arrastar ou redimensionar para mudar datas fica **fora da v1**. Como a grade por dia converte pixel em
  coluna diretamente, a v2 não fica bloqueada.

### 6.2 Estados

| Estado | Tratamento |
|---|---|
| Carregando (primeira vez) | `Skeleton` com o formato da grade: cabeçalho e 6 linhas |
| Buscando nova janela | Mantém os dados anteriores (`placeholderData`) e mostra o `Spinner` na barra de ferramentas |
| Erro | `WorkFeedback` com "Recarregar dados" |
| Projeto sem tarefas | `Empty`: "Nenhuma tarefa neste projeto", com a ação "Nova tarefa" (abre o `TaskEditor`) |
| Janela vazia, com tarefas fora dela | Dentro da moldura da grade: "Nenhuma tarefa neste período · N fora do período", com o botão Hoje |

### 6.3 Acessibilidade

- As barras, losangos e rótulos clicáveis são `Button` do shadcn (regra 6). Cada um tem nome acessível
  completo, por exemplo "API de leitura, pendente, planejada 19 nov, prazo 20 nov, atrasada".
- O grupo do objetivo usa `CollapsibleTrigger` (com `aria-expanded`) e um nome que inclui o progresso
  ("Timeline (Gantt), 0 de 6 tarefas concluídas").
- A ordem do Tab segue a de leitura: grupo, tarefas do grupo, próximo grupo, "Sem data". A grade é uma
  região com `aria-label` "Timeline do projeto".
- A linha de hoje é `aria-hidden`, com o texto `sr-only` "Hoje é 17 de novembro".
- O scroll até hoje é suave só quando `prefers-reduced-motion` não está ativo.
- O contraste do texto nas barras é AA nos temas claro e escuro, conferido na validação (§8).

### 6.4 Telefone

O telefone é secundário (memória do redesign). A coluna de rótulos passa a ter 9rem, as linhas `h-11`, e
vale o mesmo scroll horizontal. A barra de ferramentas quebra em duas linhas.

## 7. Arquivos e testes (tasks 27 a 30)

### 7.1 Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/timeline.ts` | Funções puras: janela por escala e âncora, intervalo da tarefa por caso (§5.6), coluna e span recortados pela janela, agrupamento e ordenação (§5.4), resumo do objetivo (§5.7) |
| `lib/tasks.ts` (ou o arquivo de domínio equivalente já existente) | `isTaskOverdue(task, today)` (§4.4) |
| `components/projects/ProjectTimeline.tsx` | Contêiner: lê a URL (`scale`, `anchor`), busca dados, monta a barra de ferramentas, a grade, "Sem data" e os estados |
| `components/projects/timeline/TimelineHeader.tsx` | Cabeçalho de dois níveis, fins de semana, rótulo de hoje |
| `components/projects/timeline/TimelineGroup.tsx` | Grupo do objetivo (`Collapsible`), barra-resumo e linhas das tarefas |
| `components/projects/timeline/TimelineBar.tsx` | Barra ou losango da tarefa, com `Tooltip` e nome acessível |

Não é preciso instalar nenhum componente shadcn: `Collapsible`, `ToggleGroup`, `Tooltip`, `ScrollArea`,
`Empty`, `Skeleton`, `Spinner` e `Button` já existem em `components/ui`. Também não entra dependência nova.

### 7.2 Testes

- **Vitest (`lib/timeline.ts`):** todos os casos da §5.6, recorte nas bordas da janela, as três escalas
  com o passo de ‹ › e uma âncora inválida.
- **Testing Library (`ProjectTimeline`):** grupos e ordem, estados da §6.2, clique na barra chamando
  `onOpen` com a tarefa, navegação por teclado e nomes acessíveis.
- **Playwright (`npm run test:e2e`):** abrir `?tab=timeline`, trocar a escala (a URL muda), usar Hoje e
  ‹ ›, abrir o detalhe pela barra e recarregar com `?tab=timeline&task=ID`.
- **Backend:** os testes da §4.5.
- **Comandos de pronto:** `npm run lint`, `npm test`, `npm run build` e `./mvnw test` (a suíte local do
  AGENTS.md §2).

## 8. Validação visual com `playwright-cli`

A validação é feita com a skill `playwright-cli`, no front local (`npm run dev`, logado com uma conta de
teste) e, depois do deploy, em produção. As capturas são salvas como evidência em
`docs/plans/2026-11-24-project-timeline-evidence.md`.

```bash
playwright-cli open http://127.0.0.1:5173/tasks/project/<id>?tab=timeline
for w in "1440 900" "768 1024" "390 844"; do
  playwright-cli resize $w
  playwright-cli screenshot --filename=timeline-${w%% *}-light.png
done
playwright-cli eval "document.documentElement.classList.add('dark')"
playwright-cli screenshot --filename=timeline-1440-dark.png
playwright-cli press Tab          # percorrer: escala → Hoje → ‹ › → grupo → barras
playwright-cli snapshot           # conferir nomes acessíveis e aria-expanded
playwright-cli goto "http://127.0.0.1:5173/tasks/project/<id>?tab=timeline&task=<taskId>"
playwright-cli find "Editar"      # o deep link abriu o TaskDetailsDialog
playwright-cli close
```

O que conferir nas capturas:

- a barra de ferramentas e a primeira linha visíveis sem scroll em 1440×900;
- a linha de hoje alinhada à coluna do dia;
- os rótulos `sticky` durante o scroll horizontal;
- o contraste das barras nos dois temas;
- nenhum overflow horizontal da página (só a grade rola).

Ao terminar a UI, rodar `impeccable detect --json --changed` (skill `impeccable`) e fazer uma rodada
de crítica nas capturas (`impeccable critique` ou o roteiro de crítica de `design-taste-frontend`).

## 9. Skills usadas e onde entram

| Skill | Onde |
|---|---|
| `brainstorming-skill` | Processo deste design: exploração, perguntas uma a uma, abordagens e aprovação por seção |
| `awesome-design-md` (`linear.app`) | Referência de densidade e contenção (§5.9) |
| `design-taste-frontend` (`references/app-screens.md`) | Regras de tela de app: cor no dado, superfícies planas, estados honestos (§5.9, §6.2) |
| `impeccable` | Modo *Operate*; ler `reference/craft-floor.md` antes de editar a UI; `impeccable detect` ao final (§8). O projeto não tem `PRODUCT.md`, e `/impeccable init` fica como sugestão, sem bloquear. |
| `shadcn` | Só componentes já instalados (§7.1) |
| `dataviz` | Consistência das marcas (barra, losango, resumo) e das cores por estado nos dois temas |
| `playwright-cli` | Validação visual e de teclado (§8) |

## 10. Fora do escopo da v1

- Arrastar ou redimensionar barras para mudar datas.
- Dependências entre tarefas (setas) e caminho crítico.
- Filtros próprios da timeline e aplicação dos filtros do Quadro.
- Timeline para projetos `SIMPLE` e timeline entre projetos.
- Persistir o estado aberto ou fechado dos grupos.

## 11. Mapeamento para as tasks do objetivo 14

| Task | Entrega |
|---|---|
| 26: API de leitura | §4: janela no board (REST e MCP), validação, testes e `docs/mcp.md` |
| 27: componente `ProjectTimeline` | §5 e §7.1: `lib/timeline.ts`, componentes, tokens de medida e `isTaskOverdue` |
| 28: alternar Quadro/Timeline e abrir detalhe | §6.1 |
| 29: acessibilidade, responsivo e estados | §6.2 a §6.4 |
| 30: testes e evidência | §7.2 e §8 |

## 12. Riscos e dívidas

- **Payload:** o board carrega todas as tarefas do projeto antes de filtrar, e a janela reduz a resposta,
  não a consulta. Isso é aceitável no volume atual. Se crescer, a janela pode descer para a consulta
  (`...In`/`between`) sem mudar o contrato.
- **`sticky` dentro do `ScrollArea` do Radix:** validar cedo na task 27, porque o viewport do Radix é o
  contêiner de scroll.
- **Limite de 366 dias:** é contrato público (REST e MCP). Mudá-lo depois é aditivo só se o limite subir.
