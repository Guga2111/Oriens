# Evidência da entrega: timeline de projetos (tasks 27 a 30)

Spec: [2026-11-18-project-timeline-design.md](2026-11-18-project-timeline-design.md) (§7.2 e §8).
Branch `feat/project-timeline-component`, PR #7. Validação feita em 2026-11-18, com o "hoje" do produto
igual a 18 nov 2026 (`America/Recife`).

| Task | Commit |
|---|---|
| 27: componente `ProjectTimeline` | `f192358` |
| 28: aba Timeline e abertura do detalhe | `0b80ed9` |
| 29: estados, teclado e telefone | `5b10641` |
| 30: testes, crítica visual e evidência | `8331811`, `95df211` e o commit deste documento |

## 1. O que rodou

| Comando | Resultado |
|---|---|
| `npm run lint` | 0 erros; os 14 avisos são antigos e nenhum está nos arquivos da timeline |
| `npm test` | 36 arquivos, 202 testes passando (eram 194 antes da task 30) |
| `npm run build` | ok (só o aviso antigo de chunk acima de 500 kB) |
| `npm run test:e2e -- e2e/project-timeline.spec.ts` | 2 passando: `desktop` (1440×900) e `mobile` (390×844) |
| `npm run test:e2e` (suíte inteira, só para registro) | 36 passando, 18 falhando, 18 pulados. Nenhuma falha é da timeline (§7) |
| `./mvnw test '-Dtest=!McpP2PostgresTest,!McpP3PostgresTest,!McpP4PostgresTest' -Dsurefire.failIfNoSpecifiedTests=false` | BUILD SUCCESS: 137 testes, 0 falhas, 62 pulados |
| `impeccable detect --json --changed` | `[]`. Também rodado direto sobre `ProjectTimeline.tsx` e `timeline/`: `[]` |
| Validação visual com `playwright-cli` (§8) | 12 capturas em 1440, 768 e 390, claro e escuro, mais teclado e deep link (§4) |

### Ambiente do e2e e da validação visual

- A porta 8080 deste computador é de outro projeto. A API subiu com um compose descartável fora do
  repositório (scratchpad): API em `127.0.0.1:8081`, Postgres sem porta publicada, volume próprio e
  `JWT_SECRET` aleatório. Flyway criou o schema no startup.
- O front rodou em `localhost:5173` (`VITE_API_BASE_URL=http://127.0.0.1:8081`), a única origem aceita pelo
  CORS da API. O `e2e` usou `E2E_API_BASE_URL=http://127.0.0.1:8081`.
- Nenhuma mudança de porta ou de configuração foi commitada. Os containers, o compose e os scripts de
  seed foram apagados ao final.

## 2. O que não rodou

- `McpP2PostgresTest`, `McpP3PostgresTest` e `McpP4PostgresTest`: precisam do Postgres de prova
  (`ops/postgres-tests.sh`). O backend não mudou na task 30; a janela do board foi coberta na task 26
  (`BoardWindowTest` e `McpP2PostgresTest`).
- Os 62 testes pulados do `./mvnw test` são os `*PostgresTest`, que exigem variáveis de ambiente próprias.
- A validação visual em produção (§8, "depois do deploy") fica para depois do merge. Nada foi para a `main`.
- As 18 falhas da suíte e2e fora da timeline não foram investigadas nem corrigidas (fora do escopo).

## 3. Cobertura da §7.2

| Item da §7.2 | Teste que cobre |
|---|---|
| **`lib/timeline.ts`** | `src/__tests__/timeline.test.ts` |
| Casos de data da §5.6: `planned ≤ due`, só `planned`, só `due`, nenhuma, `planned > due` | `task span (§5.6) › maps each date case` |
| "Sem data" fora da grade e canceladas ocultas | `layoutTimeline (§5.4) › hides cancelled tasks, keeps undated apart…` |
| Recorte nas bordas da janela | `clips ranges at the window edges and drops ranges outside it`; `keeps square corners only on the sides that really cross the window` (inclui barra invertida cortada) |
| As três escalas | `spans each scale around the anchor, with Monday weeks and month starts`; `keeps every window within the 366-day board limit, even across a leap year` |
| Passo de ‹ › | `steps half of the window: 4 weeks, 8 weeks and 4 months`; `steps back and forth in every scale, returning to the anchor` |
| Âncora inválida | `ignores an invalid anchor or scale` |
| **`ProjectTimeline` (Testing Library)** | `src/__tests__/project-timeline.test.tsx` |
| Grupos e ordem | `fetches the fortnight window and groups rows by objective position, "Sem objetivo" last`; `layoutTimeline › groups by objective position…` |
| §6.2 Carregando (primeira vez) | `shows a grid-shaped skeleton (header and 6 rows) on the first load` |
| §6.2 Buscando nova janela | `keeps the previous data with a toolbar spinner while a new window loads` |
| §6.2 Erro | `offers a retry when the board fails to load` |
| §6.2 Projeto sem tarefas | `shows the empty project state without the grid and asks the page for a new task`; `project-detail-timeline › "Nova tarefa" in the empty timeline opens the page TaskEditor` |
| §6.2 Janela vazia com tarefas fora | `shows an empty window inside the grid frame with a Hoje button that drops the anchor`; `keeps an undated task in "Sem data" instead of showing the empty window` |
| Clique na barra chama `onOpen` com a tarefa | `names bars by state and dates, flags overdue, and opens the task on click` |
| Navegação por teclado | `tabs from the toolbar through each group and its bars, then "Sem data"; row labels never take focus`; `collapses and reopens an objective group from the keyboard` |
| Nomes acessíveis | `names bars by state and dates…`; `names completed and inverted bars…`; `hides the today line from assistive tech and announces today as text`; nomes dos grupos no primeiro teste |
| Título dentro da barra, canto reto e borda da pendente | `puts the title inside a bar only when it spans enough days, and squares the clipped edge` |
| **Playwright** | `e2e/project-timeline.spec.ts` (um teste, nos projetos `desktop` e `mobile`) |
| Abrir `?tab=timeline` | Aba "Timeline" com `aria-selected`, região "Timeline do projeto", barra, losango e "Sem data" |
| Trocar a escala (a URL muda) | Semana → `scale=week`; Mês → `scale=month` |
| Hoje e ‹ › | › leva `anchor` para hoje + 4 meses e a barra sai da janela; ‹ volta para hoje; Hoje remove `anchor` e mantém `scale` |
| Abrir o detalhe pela barra | Clique na barra abre o `TaskDetailsDialog` com o título da tarefa e `?task=ID` |
| Recarregar com `?tab=timeline&task=ID` | `goto` do deep link mais `reload`: o diálogo continua aberto, com "Editar" |
| Integração com a página | `src/__tests__/project-detail-timeline.test.tsx` (6 testes, task 28) |

Os dados do e2e são criados pela API com o `E2E_TOKEN` do `global-setup`: um projeto `DEVELOPMENT`, um
objetivo, uma tarefa com planejamento e prazo, uma só com prazo e uma sem data. As datas saem de
`productNow()`, e os títulos levam o nome do projeto do Playwright e `Date.now()`, porque desktop e
mobile usam a mesma conta. A API exige `Idempotency-Key` nas criações e a `projectVersion` atual em cada
tarefa, relida antes de cada uma.

## 4. Validação visual (§8)

Dados de validação numa conta própria: dois objetivos (um com prazo vencido), tarefas concluída,
atrasada, em andamento, pendente, invertida (planejada depois do prazo), losango, barra de 1 dia, barra
cortada na borda, "Sem data" e uma cancelada.

| Captura | O que prova |
|---|---|
| [light-1440-fortnight](../screenshots/project-timeline/light-1440-fortnight.png) | Barra de ferramentas e primeira linha sem scroll em 1440×900; linha de hoje na coluna de 18 nov; todos os estados de barra; "1 cancelada oculta" |
| [dark-1440-fortnight](../screenshots/project-timeline/dark-1440-fortnight.png) | Mesmos estados no tema escuro |
| [light-1440-sticky-scroll](../screenshots/project-timeline/light-1440-sticky-scroll.png) | Rótulos `sticky` durante o scroll horizontal; barras e nome do mês passam por baixo da coluna |
| [dark-1440-month-before](../screenshots/project-timeline/dark-1440-month-before.png) | Antes da correção: faixas de fim de semana pesadas e barras pendentes sem contorno visível |
| [dark-1440-month](../screenshots/project-timeline/dark-1440-month.png) | Depois da correção (`95df211`) |
| [light-1440-month](../screenshots/project-timeline/light-1440-month.png) | Escala Mês no claro, depois da correção |
| [light-768-fortnight](../screenshots/project-timeline/light-768-fortnight.png) | 768px: grade e "Sem data" na largura da moldura |
| [light-390-fortnight](../screenshots/project-timeline/light-390-fortnight.png) | Telefone: barra de ferramentas em duas linhas, rótulos de 9rem, linhas `h-11` |
| [dark-390-fortnight](../screenshots/project-timeline/dark-390-fortnight.png) | Telefone no escuro |
| [light-1440-keyboard](../screenshots/project-timeline/light-1440-keyboard.png) | Foco por Tab numa barra: anel de foco e tooltip no foco |
| [dark-1440-deeplink](../screenshots/project-timeline/dark-1440-deeplink.png) | `?tab=timeline&task=32` depois de `reload`: `TaskDetailsDialog` aberto, com "Editar" |
| [dark-390-deeplink](../screenshots/project-timeline/dark-390-deeplink.png) | O mesmo deep link no telefone |

Checagem da §8:

- **Sem overflow horizontal da página:** `scrollWidth − innerWidth = 0` em todas as capturas; só a grade rola.
- **Ordem do Tab** (registrada com `playwright-cli press Tab`): escala → Hoje → Período anterior → Próximo
  período → "API de leitura da janela, 2 de 3 tarefas concluídas, prazo 16 nov, atrasado" (`aria-expanded=true`)
  → as três barras do grupo → "Timeline (Gantt), 0 de 6 tarefas concluídas, prazo 27 nov" → as barras do
  grupo, cada uma com o nome completo (por exemplo "Estados e teclado, a fazer, planejada 26 nov, prazo
  23 nov, planejada para depois do prazo").
- **Deep link:** o diálogo reabre depois do `reload` em 1440 e em 390.
- **Contraste:** §5.

## 5. Crítica visual (`impeccable`, modo *Operate*)

O detector não acusou nada. A crítica sobre as capturas avaliou as duas pendências herdadas da task 29.

| Achado | Avaliação | Decisão |
|---|---|---|
| Borda da barra pendente com contraste baixo (1,4:1 claro, 1,8:1 escuro) | Falha de AA não textual (WCAG 1.4.11): numa barra curta, sem título dentro, o contorno é o único sinal do controle. Na captura, "Revisão de contraste" (1 dia) quase some | **Corrigido** em `95df211`: `border-border` → `border-muted-foreground`, token existente. Ficou em 6,4:1 (claro) e 8,8:1 (escuro) |
| Faixas de fim de semana pesadas no escuro, na escala Mês | `bg-muted` é o mesmo token do preenchimento das barras pendente e concluída (`muted` = `secondary` = `accent` nos dois temas). Com dias de 0,75rem, as faixas viram listras que competem com o dado, e uma barra concluída sobre o fim de semana some | **Corrigido** em `95df211`: faixa em `bg-card`, token existente e o único diferente de todos os preenchimentos de barra. Desvio do spec registrado em §6 |
| Barra concluída com contraste baixo contra o fundo (cerca de 1,2:1) | Intencional: a concluída recua. É identificada pelo ícone ✓ e pelo título riscado, e não fica mais idêntica à faixa | Dívida (§7) |

Fora isso, as capturas seguem as referências da §5.9: cor só no dado, superfícies planas, a moldura se
mantém nos estados vazios e a tarefa fica a um clique.

## 6. Contraste

Calculado a partir dos tokens de `src/index.css`. Todos os pares de texto passam 4,5:1 nos dois temas.

| Par | Claro | Escuro |
|---|---|---|
| pendente (`foreground` / `secondary`) | 13,7 | 11,3 |
| em andamento (`primary-foreground` / `primary`) | 10,0 | 10,0 |
| concluída (`muted-foreground` / `muted`) | 5,8 | 6,6 |
| atrasada (`negative` / `secondary`) | 5,5 | 4,9 |
| título fora da barra e losango, sobre o fundo ou a faixa de fim de semana (pior caso, depois de `95df211`) | 6,0 | 5,9 |
| borda da barra pendente contra o fundo, não textual (≥ 3:1): antes → depois | 1,4 → 6,4 | 1,8 → 8,8 |
| borda da barra pendente contra a faixa de fim de semana, depois | 6,8 | 7,9 |

As quatro primeiras linhas vêm da task 29 (descrição do PR #7) e não mudaram, porque os preenchimentos
das barras são os mesmos.

## 7. Desvios do spec (tasks 27 a 30)

| Desvio | Spec | O que foi feito e por quê |
|---|---|---|
| Concluída com planejamento depois do prazo | §5.6: estilo de atrasada | Mantém o visual de concluída; o aviso fica no nome acessível e na tooltip. Uma tarefa concluída não está atrasada |
| Título dentro da barra | §5.5: "quando cabe" | Decidido pelo número de dias da barra (`TITLE_INSIDE_DAYS`: 2, 3 e 8 dias, cerca de 6rem), sem medir o texto |
| Linha de hoje | §5.8: atravessa a grade | Começa abaixo do cabeçalho (5rem fixos) para não cruzar as datas; o rótulo "Hoje" fica no cabeçalho |
| Rótulo da linha da tarefa | §6.3: alvo de foco | Fora do Tab (`tabIndex={-1}` e `aria-hidden`). Cada tarefa é uma só parada de Tab, a barra, com o nome completo |
| Texto `sr-only` de hoje | §6.3: "Hoje é 17 de novembro" | "Hoje é 18 de novembro de 2026", com o ano, pelo formatador existente (`formatLongDate`) |
| Aviso do período vazio | §6.2: dentro da moldura da grade | No topo da moldura, fora do `ScrollArea`, para quebrar linha no telefone sem cortar o botão Hoje |
| "Nova tarefa" no projeto vazio | §6.2: abre o `TaskEditor` | Via callback `onAdd` da página, que abre o `TaskEditor` existente. A timeline não tem um segundo editor |
| Faixa de fim de semana (task 30) | §5.3: `bg-muted` | `bg-card`. No escuro, é um degrau mais leve (16% sobre 12% de luminosidade). No claro, o degrau fica mais claro que o fundo, não mais escuro (§5) |
| Borda da barra pendente (task 30) | §5.5: `border border-border` | `border border-muted-foreground`, para AA não textual (§5) |

## 8. Dívida conhecida

- **`WorkFeedback`:** mostra "Não foi possível salvar. Seu rascunho foi mantido." num erro 500 de
  leitura. É o texto genérico do componente compartilhado; não foi alterado.
- **Barra concluída** com cerca de 1,2:1 contra o fundo e a faixa (§5). Recuo intencional, identificado
  por ícone e título riscado. Se for preciso contorno, falta um token neutro entre `border` e
  `muted-foreground`.
- **Payload do board:** a janela reduz a resposta, não a consulta (spec §12).
- **Validação em produção** (§8) depois do deploy.
- **Suíte e2e fora da timeline:** 18 falhas no run de 2026-11-18 contra a API descartável, não
  investigadas. Algumas falham já na criação de dados pela API (`response.ok()` falso, por exemplo em
  `financial.spec.ts`).
  - desktop e mobile: `motion.spec.ts` (conclusão anima o check), `config.spec.ts` (WhatsApp),
    `projects.spec.ts` (cria projeto com objetivo), `tasks.spec.ts` (cria, conclui e alterna) e
    `shell.spec.ts` (um h1 por rota);
  - desktop: `financial.spec.ts` (troca de mês), `week.spec.ts` (cabeçalho do dia em 1440 e grade em 1024);
  - mobile: `all-data.spec.ts` (tabela vira lista), `responsive.spec.ts` (linha do dia, agenda semanal,
    `/all-data` com Sheet e formulários em Drawer de 360px).
- **Backend:** `McpP2/P3/P4PostgresTest` seguem fora da suíte local sem o Postgres de prova (AGENTS.md §2).
