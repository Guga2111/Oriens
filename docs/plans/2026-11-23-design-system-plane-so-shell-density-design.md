# Plano de design — fase 2: shell do plane.so com trilho de contextos e densidade

**Data:** 2026-11-23  
**Autor:** Claude Code  
**Status:** aprovada — em implementação  
**Depende de:** [2026-11-22-design-system-plane-so-orange-design.md](2026-11-22-design-system-plane-so-orange-design.md)
(fase 1, cores; PR #17)

**Pedido do usuário (2026-11-23):** "Quero que fique como no Plane." Isso significa:
1. Shell do Plane: barra superior e trilho no canvas cinza, com sidebar e conteúdo dentro de um painel branco.
2. Navegação agrupada por **contexto**, um quadrado no trilho para cada um (como Work, Wiki e AI no Plane).
   Hoje existem três: **Trabalho** (Hoje, Projetos, Todos os dados), **Financeiro** e **Estatísticas**.
   No futuro virão Jogos, Animes/Séries/Filmes e, depois, Livros.
3. A densidade do Plane: cabeçalho de 48px e controles de 28–32px.

Peso de fonte 450 e texto de 13px continuam fora de escopo (§7).

## 1. Contexto

A fase 1 trocou só as cores. O que faz uma tela parecer o Plane é a estrutura (canvas, trilho, painel)
e a densidade. A navegação atual é uma sidebar única com o grupo "Planejar" (Hoje, Projetos,
Financeiro, Estatísticas, Todos os dados), "Projetos recentes", "Administração" (admin) e um menu do
usuário no rodapé. Com novos domínios a caminho, essa lista não escala; o trilho de contextos resolve
isso, como no Plane.

## 2. Referência medida no app real

**Método.** `app.plane.so`, workspace `gugones`, aberto no Chrome logado do usuário (só leitura) em
2026-11-23. Medidas em px CSS pelo DOM, janela de 1460 × 780, tema claro. O layout do projeto foi
alternado para lista para medir as linhas e depois voltou para kanban. O tema escuro não foi aberto,
porque trocar o tema altera a conta do usuário.

| Elemento | Plane |
|---|---|
| Fundo da janela | canvas cinza (`--background` da fase 1) |
| **Barra superior** (workspace, busca, ajuda, conta) | **40px**, no canvas; botões de 28px, 13px/500 |
| **Trilho** (Work, Wiki, AI; Settings embaixo) | **60px**, no canvas; item de 44 × 47 (ícone num quadrado + rótulo pequeno embaixo); item ativo com quadrado destacado |
| **Painel** | branco, `border 1px` sutil, **raio 8px**; encosta na barra e no trilho e fica a **8px** da borda direita e da de baixo; sem sombra |
| Sidebar (dentro do painel) | ≈249px, `padding 12px`, **borda direita 1px**; topo com o nome do contexto ("Work") + ações |
| Botão primário da sidebar ("New work item") | 32px, raio 6px, borda 1px, 14px/500 |
| Item da sidebar | **32px**, raio 8px, `padding 0 8px`, 14px/500; ativo = fundo `foreground` a 8% |
| Grupo da sidebar ("Workspace", "Projects") | rótulo 13px/600 recolhível; projeto expandido mostra subpáginas recuadas com linha-guia (Overview, Work items, Cycles…) |
| **Cabeçalho da página** | **48px**, `border-bottom 1px`, `padding 0 21.6px`; breadcrumb 13px/500 à esquerda, ações à direita |
| Botões do cabeçalho | **28px**, raio 6px, `padding 0 10px`, 13px/500 |
| Título de destaque | 20px/600 |
| Linha de lista | **48px**, `padding 12px 21.6px`, 13px |
| Chip de propriedade | **24px**, raio 6px, borda 1px, 12px |
| Coluna do kanban | 336px, fundo cinza muito claro, raio 8px, `padding 8px` |
| Card do kanban | branco, **raio 12px**, `padding 12px`; título 14px/500, ID 12px/500 |

### O Oriens hoje

| Elemento | Oriens (`dev` + fase 1) |
|---|---|
| Shell | `<Sidebar collapsible="icon">` fixa e conteúdo ocupando a janela; sem barra superior, trilho nem painel |
| Cabeçalho do shell (`AppHeader`) | 64px; trigger da sidebar + breadcrumb + `NotificationBell` |
| Menu do usuário | rodapé da sidebar (Configurações, Ajuda & Suporte, tema, Sair) |
| `PageHeader` | `h1` 24px + descrição + metadados |
| Gutter | até 4rem; `py-4 md:py-8` |
| Controles | 40px (`button`, `input`, `select`, `toggle`, `tabs`) |

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Shell do Plane:** barra superior de 40px e trilho de 60px no canvas; painel `bg-card`, `border`, `rounded-lg`, com a sidebar do contexto e o conteúdo **dentro** dele, separados por borda de 1px. | É a estrutura medida no Plane. |
| D2 | **Contextos no trilho:** Trabalho, Financeiro e Estatísticas em cima; **Configurações** embaixo, como o Settings do Plane. O contexto ativo vem do caminho da URL; **nenhuma rota muda**. | O pedido do usuário. Manter as rotas não quebra links, favoritos, e2e nem o OAuth do MCP (`/config`). |
| D3 | **Uma única lista de contextos** em `components/layout/app-contexts.ts` (id, rótulo, ícone, prefixos de rota, itens da sidebar). O trilho e a sidebar leem essa lista. Um contexto novo (Jogos, Mídia, Livros) entra com uma entrada nova e as rotas dele. **Nenhum item "em breve" agora.** | Três contextos já existem, então a lista não é especulativa. Placeholders de domínios que ainda não existem seriam (YAGNI). |
| D4 | **Sidebar dentro do painel com o `Sidebar collapsible="none"` do shadcn**, que já renderiza uma coluna estática. O botão do cabeçalho mostra ou esconde a sidebar pelo estado do `SidebarProvider`; o trilho fica sempre visível no desktop. | Reusa o componente sem a sidebar fixa (`position: fixed`), que impedia colocá-la dentro do painel na versão anterior desta spec. |
| D5 | **Barra superior:** à esquerda, o logo e o nome "Oriens" (no lugar do seletor de workspace); à direita, `NotificationBell` e o avatar com o **menu do usuário atual** (os mesmos itens, que saem do rodapé da sidebar). **Sem busca** (não existe busca global hoje). | Fiel ao Plane, sem inventar funcionalidade. |
| D6 | **Cabeçalho da página com 48px, dentro do painel:** botão da sidebar + breadcrumb. O sino vai para a barra superior. | Medida do Plane. |
| D7 | **Densidade:** `PageHeader` com `h1` de 20px; controles com 32px (`sm` 28px) no desktop; gutter de 20px; kanban como no Plane (§5.6). No mobile, os alvos de toque continuam com 40–44px. | Medidas do Plane; acessibilidade (frontend.md §7). |
| D8 | **Mobile (< 1100px, o breakpoint atual da sidebar):** o trilho e a sidebar saem da tela e abrem juntos num `Sheet` pelo botão de menu da barra superior; o painel ocupa a largura toda, sem margem nem raio. | O Plane é desktop-first. O Oriens já usa Sheet abaixo de 1100px e mantém o padrão. |
| D9 | **Sem token de cor novo.** O quadrado ativo do trilho usa `bg-accent`, e o item ativo da sidebar usa `bg-sidebar-accent` (já existe). | O `--accent` da fase 1 (#EAEBEC) é o cinza de seleção do Plane. |

## 4. Abordagens consideradas

| # | Abordagem | Trade-offs |
|---|---|---|
| A | `Sidebar variant="inset"` com a sidebar no canvas e só o conteúdo no painel (versão anterior desta spec). | Menos trabalho, mas o usuário pediu igual ao Plane: sidebar dentro do painel e trilho de contextos. |
| **B** | Barra superior + trilho próprios (composição com `Button`, `Tooltip` e `Sheet`) + `Sidebar collapsible="none"` dentro do painel. | **Escolhida.** Fiel ao Plane e reusa shadcn; o shell é reescrito, mas as páginas não. |
| C | Trocar a sidebar do shadcn por uma sidebar feita à mão. | Duplicaria `ui/sidebar.tsx` (menus, ações, teclado); proibido pelo frontend.md §2. |

## 5. Design

### 5.1 Estrutura do shell (`AppLayout.tsx`)

```
┌──────────────────────────────────────────────────────────── canvas (bg-background) ─┐
│ [☰ mobile] ◒ Oriens                                         🔔  (avatar ▾)   40px │
├──────┬───────────────────────────────────────────────────────────────────────────┐ │
│ [▣]  │ Trabalho        [⇤] │ [⇤] Projetos › Lançamento Oriens            48px     │ │
│Trab. │ [+ Nova tarefa]     ├──────────────────────────────────────────────────────┤ │
│ [▣]  │ ◉ Hoje              │                                                      │ │
│Finan.│ ◉ Projetos          │   conteúdo da rota (<Outlet/>)                        │ │
│ [▣]  │ ◉ Todos os dados    │   px 20px · py 20px                                  │ │
│Estat.│ Projetos       ▾    │                                                      │ │
│      │ ● Lançamento Oriens │                                                      │ │
│      │   │ Quadro          │                                                      │ │
│      │   │ Objetivos       │                                                      │ │
│      │   │ Linha do tempo  │                                                      │ │
│ [⚙]  │                     │                                                      │ │
│Config│ (sidebar 16rem)     │                                        painel 8px ─► │ │
└──────┴─────────────────────┴──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Raiz: `flex h-svh flex-col bg-background`.
- `AppTopBar` (novo, `components/layout/`): `h-10`, no canvas.
- Linha de baixo: `flex min-h-0 flex-1`:
  - `AppContextRail` (novo): `w-rail` (60px, token `--rail-width`; a escala do Tailwind 3 não tem 60px), no canvas.
  - Painel: `min-w-0 flex-1 mb-2 mr-2 flex overflow-hidden rounded-lg border bg-card`.
    - `AppSidebar` com `<Sidebar collapsible="none">` e `border-r`.
    - Coluna de conteúdo: `AppHeader` (48px) + área rolável com o `<Outlet/>`.
- Tokens novos de geometria em `index.css` + `tailwind.config.ts`: `--top-bar-height: 2.5rem`,
  `--rail-width: 3.75rem`, `--app-header-height: 3rem` (hoje 4rem).
- `--sidebar-background` passa de `var(--background)` para **`var(--card)`**, porque a sidebar agora
  fica dentro do painel branco. É um mapeamento, não uma cor nova.

### 5.2 Contextos (`components/layout/app-contexts.ts`)

| Contexto | Ícone (lucide) | Rotas que o ativam | Itens da sidebar |
|---|---|---|---|
| Trabalho | `BriefcaseBusiness` | `/tasks`, `/tasks/project/:id`, `/projects`, `/all-data` | Hoje, Projetos, Todos os dados; grupo **Projetos** (§5.4) |
| Financeiro | `PiggyBank` | `/financial` | Visão geral |
| Estatísticas | `ChartLine` | `/stats` | Visão geral |
| Configurações (embaixo) | `Settings` | `/config`, `/support`, `/admin/*` | Configurações, Ajuda & Suporte; grupo **Administração** (só `ADMIN`): Dashboard de Suporte, Gerenciar Admins |

Clicar num contexto navega para a primeira rota dele. Contextos com um único item (Financeiro,
Estatísticas) mostram a sidebar com esse item; ela cresce quando o domínio ganhar páginas. Os ícones
de Financeiro e Estatísticas são os mesmos de hoje.

Um contexto futuro (ex.: Jogos `Gamepad2`, Mídia `Clapperboard`, Livros `BookOpen`) é uma entrada
nova nessa lista mais as rotas dele, com spec própria. Não entra agora.

### 5.3 Trilho (`AppContextRail.tsx`)

- `nav aria-label="Contextos"`, com uma lista de `Button asChild variant="ghost"` + `NavLink`.
- Item: coluna `w-11 gap-1 py-1`; ícone num quadrado `size-8 rounded-md`; rótulo `text-xs`
  (12px, o mais perto do Plane na escala).
- Ativo: quadrado `bg-accent text-foreground` e `aria-current="page"`. Inativo: `text-muted-foreground`
  e `hover:bg-accent`.
- Configurações fica no fim (`mt-auto`), como o Settings do Plane.
- Rótulo sempre visível, sem depender de tooltip, para o nome acessível ser o texto.

### 5.4 Sidebar do contexto (`AppSidebar.tsx`)

- `SidebarHeader` com 48px (mesma linha do cabeçalho da página): nome do contexto (`text-base
  font-semibold`) + botão para esconder a sidebar (`size-7`, `aria-label="Esconder menu"`).
- **Trabalho**:
  - `Button variant="outline"` **"Nova tarefa"**, largura total e 32px. Abre o `TaskEditor` existente
    para uma tarefa avulsa, como o "New work item" do Plane. O `TaskEditor` é reusado, sem criar outro
    fluxo de criação.
  - Itens Hoje, Projetos, Todos os dados.
  - Grupo recolhível **Projetos** (`Collapsible` do shadcn): os mesmos projetos de "Projetos recentes",
    com a ação de favoritar. O projeto aberto mostra **subitens** recuados com linha-guia (`SidebarMenuSub`
    do shadcn): **Quadro**, **Objetivos**, **Linha do tempo**, que apontam para
    `/tasks/project/:id?tab=board|objectives|timeline`. Essas abas já existem em `ProjectDetailPage`.
- **Configurações**: itens e grupo Administração como na §5.2. O grupo "Administração" sai da sidebar
  de Trabalho.
- Itens: `SidebarMenuButton` (já tem 32px); ativo com `data-[active=true]:bg-sidebar-accent` (já existe).
- **Sem rodapé**: o menu do usuário vai para a barra superior (D5).

### 5.5 Barra superior e cabeçalho

- `AppTopBar`: botão de menu (só abaixo de 1100px, abre o Sheet de D8), `OriensLogo` + "Oriens"
  (`text-sm font-semibold`), espaço, `NotificationBell`, avatar com `DropdownMenu` (itens atuais:
  Configurações, Ajuda & Suporte, tema, Sair). Botões de 28px no desktop e 40px no mobile.
- `AppHeader` (dentro do painel): `h-[--app-header-height]` (48px), `border-b`, `px-5`. Botão
  "mostrar/esconder menu" (`size-7`) + breadcrumb atual. O sino sai daqui.
- `PageHeader`: `text-2xl leading-8` → `text-xl leading-7`.

### 5.6 Densidade (`src/components/ui/`, `index.css`, kanban)

| Item | Hoje | Novo (≥ md) |
|---|---|---|
| `button` default / sm / icon / lg | 40 / 36 / 40 / 44px | **32 / 28 / 32 / 36px** (`h-8 px-3` · `h-7 px-2.5 text-xs` · `size-8` · `h-9 px-4`) |
| `input`, `select` (trigger) | 40px | **32px** (`h-8 py-1`) |
| `toggle` default / sm | 40 / 36px | **32 / 28px** |
| `tabs` (lista) | 40px | **32px** |
| `--page-gutter` | 1 / 2 / 4rem | **1 / 1.25 / 1.25rem** |
| Área de conteúdo | `py-4 md:py-8` | **`py-4 md:py-5`** |
| Coluna do kanban (`ProjectBoard`) | — | `bg-background rounded-lg p-2` |
| Card do kanban | — | `bg-card rounded-xl p-3 border`; título `text-sm font-medium`; metadados `text-xs` |

Os `max-md:min-h-10` / `max-md:h-10` existentes ficam (toque no mobile).

### 5.7 Mobile (< 1100px)

- O trilho e a sidebar saem do fluxo; o botão de menu da barra superior abre um `Sheet` (lado esquerdo)
  com **trilho + sidebar lado a lado**, a mesma composição do desktop.
- O painel ocupa a largura toda, sem `mb-2 mr-2`, `rounded-lg` nem borda lateral.
- Trocar de rota fecha o Sheet, como já acontece hoje.

## 6. Acessibilidade

- Trilho: `nav` com nome, `aria-current` no contexto ativo, rótulo visível em todo item e foco com `ring-ring`.
- Sidebar: `nav aria-label` com o nome do contexto; subitens do projeto em lista aninhada.
- Botões de mostrar/esconder menu com `aria-label` e `aria-expanded`.
- Alvos de toque ≥40px no mobile; ≥28px no desktop (WCAG 2.5.8 pede 24px).
- Ordem de foco: barra superior → trilho → sidebar → cabeçalho → conteúdo.
- Um `h1` por rota (no `PageHeader`).

## 7. Fora de escopo

- Busca global, seletor de workspace e "Pages"/"Views" do Plane: não existem no Oriens.
- Contextos Jogos, Mídia e Livros (só a estrutura para recebê-los, D3).
- Peso de fonte 450 e texto de 13px.
- Redesenho de telas além do que herdam da densidade (§5.6) e do kanban.
- Páginas públicas (fase 1), backend, rotas, dependências novas.

## 8. Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `oriens-front/src/components/layout/AppLayout.tsx` | estrutura §5.1 |
| `oriens-front/src/components/layout/AppTopBar.tsx` (novo) | §5.5 |
| `oriens-front/src/components/layout/AppContextRail.tsx` (novo) | §5.3 |
| `oriens-front/src/components/layout/app-contexts.ts` (novo) | §5.2 |
| `oriens-front/src/components/layout/AppSidebar.tsx` | §5.4; menu do usuário sai para a barra |
| `oriens-front/src/components/common/AppHeader.tsx`, `PageHeader.tsx` | §5.5 |
| `oriens-front/src/components/ui/{button,input,select,toggle,tabs}.tsx` | §5.6 |
| `oriens-front/src/components/projects/ProjectBoard.tsx` | kanban §5.6 |
| `oriens-front/src/index.css`, `tailwind.config.ts` | tokens de geometria, `--sidebar-background` |
| `oriens-front/src/__tests__/`, `oriens-front/e2e/` | testes de §9 e ajustes de navegação |

`ui/sidebar.tsx` não muda: `collapsible="none"` e `SidebarMenuSub` já existem.

## 9. Critérios de aceitação

- [ ] Desktop (≥1100px): barra superior de 40px e trilho de 60px no canvas; painel branco com borda e raio de 8px, a 8px da direita e de baixo, com a sidebar dentro.
- [ ] Trilho com Trabalho, Financeiro, Estatísticas e Configurações (embaixo); contexto ativo pela URL, com `aria-current`.
- [ ] Sidebar mostra só os itens do contexto ativo; Administração só para `ADMIN`, dentro de Configurações.
- [ ] Projeto aberto mostra Quadro, Objetivos e Linha do tempo como subitens, que abrem a aba certa.
- [ ] "Nova tarefa" na sidebar de Trabalho abre o `TaskEditor`.
- [ ] Menu do usuário e sino na barra superior, com os mesmos itens de hoje.
- [ ] Esconder/mostrar a sidebar no desktop; no mobile, trilho + sidebar num Sheet.
- [ ] Cabeçalho de 48px, `h1` de 20px, controles de 32/28px no desktop e ≥40px no mobile, gutter de 20px.
- [ ] Nenhuma rota alterada; links antigos funcionam.
- [ ] Testes novos:
  - `app-contexts`: caminho → contexto (cada rota de §5.2, inclusive `/tasks/project/:id` e `/admin/*`).
  - Trilho: contexto ativo com `aria-current`; Configurações por último.
  - Sidebar: itens por contexto; Administração escondida para não admin; subitens do projeto.
- [ ] `npm run lint`, `npm test`, `npm run build`; e2e `shell`, `navigation` e `responsive` atualizados e passando.
- [ ] Revisão visual nos dois temas, ao lado das capturas do Plane: Hoje, Semana, Projetos, projeto (kanban, objetivos, linha do tempo), Todos os dados, Financeiro, Estatísticas, Configurações; e mobile (≤640px).

## 10. Riscos

- **O shell inteiro muda.** O teste e2e de navegação e os seletores por papel ("Alternar menu de
  navegação", itens da sidebar) vão mudar. Mitigação: atualizar os e2e no mesmo PR e manter os nomes
  acessíveis dos itens.
- **A altura do conteúdo muda** (40 + 48px no lugar de 64px, com o painel). Telas com altura calculada
  (linha do tempo, kanban, `--dialog-max-height`) precisam de revisão visual.
- **Altura global dos controles** muda para todas as telas de uma vez.
- **Contextos de um item só** (Financeiro, Estatísticas) deixam a sidebar quase vazia até esses domínios
  crescerem. Alternativa, se incomodar na revisão: esconder a sidebar nesses contextos.
- **OAuth do MCP** usa `/config` e telas de consentimento; as rotas não mudam, mas a tela precisa ser
  revisada dentro do novo shell.

## 11. Implementação

Um PR para `dev`, empilhado sobre a fase 1 (PR #17): `feat(design): adopt plane.so shell with context rail`.

1. `app-contexts.ts` + testes (caminho → contexto).
2. `AppTopBar`, `AppContextRail`, novo `AppLayout` com o painel (§5.1, §5.3, §5.5).
3. `AppSidebar` por contexto, com subitens de projeto e "Nova tarefa" (§5.4).
4. Mobile com Sheet (§5.7).
5. Densidade dos controles, gutter e kanban (§5.6).
6. Testes e e2e, lint, build, revisão visual e evidência em
   `docs/plans/2026-11-23-design-system-plane-so-shell-density-evidence.md`.
