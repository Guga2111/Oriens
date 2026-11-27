# Dependências do cliente

O [`package.json`](../../../apps/client/package.json) declara as dependências
diretas. O [`package-lock.json`](../../../apps/client/package-lock.json) fixa as
versões instaladas por `npm ci` no setup e no CI. Em `apps/client/`, consulte a
instalação com `npm ls --depth=0`. O [`bun.lockb`](../../../apps/client/bun.lockb)
também está versionado.

## Aplicação, dados e interações

| Pacote | Propósito e local de uso |
|---|---|
| `react` | Componentes, hooks e contextos na [SPA](../../../apps/client/src/App.tsx). |
| `react-dom` | Monta a SPA em [`main.tsx`](../../../apps/client/src/main.tsx) e cria portais em [`HeaderActions`](../../../apps/client/src/components/common/HeaderActions.tsx). |
| `react-router-dom` | Roteamento, links e navegação iniciados em [`App.tsx`](../../../apps/client/src/App.tsx). |
| `@tanstack/react-query` | Cache, consultas e mutações de servidor em [`useWork`](../../../apps/client/src/hooks/useWork.ts). |
| `axios` | Cliente HTTP e interceptores em [`services/api.ts`](../../../apps/client/src/services/api.ts). |
| `jwt-decode` | Leitura dos dados do token para a sessão em [`AuthContext`](../../../apps/client/src/context/AuthContext.tsx). |
| `date-fns` | Formatação e operações com datas, por exemplo em [`StatisticsPeriodPicker`](../../../apps/client/src/components/statistics/StatisticsPeriodPicker.tsx). |
| `react-day-picker` | Calendário e seleção de datas no wrapper [`calendar.tsx`](../../../apps/client/src/components/ui/calendar.tsx). |
| `@react-google-maps/api` | Carregamento e renderização do mapa em [`LocationMap`](../../../apps/client/src/components/dashboard/LocationMap.tsx). |
| `@dnd-kit/core` | Sensores e eventos de arraste em [`ProjectBoard`](../../../apps/client/src/components/projects/ProjectBoard.tsx). |
| `@dnd-kit/sortable` | Ordenação por arraste no [quadro](../../../apps/client/src/components/projects/ProjectBoard.tsx) e nos [cards](../../../apps/client/src/components/projects/BoardTask.tsx). |
| `@dnd-kit/utilities` | Conversão da transformação de arraste em CSS em [`BoardTask`](../../../apps/client/src/components/projects/BoardTask.tsx). |
| `recharts` | Gráficos, como o [fluxo financeiro do mês](../../../apps/client/src/components/financial/MonthFlowChart.tsx) e as [análises de estatísticas](../../../apps/client/src/components/statistics/AnalysisCharts.tsx). |

## Componentes e aparência

O [`components.json`](../../../apps/client/components.json) configura o shadcn/ui
com estilo `default`, base `slate` e variáveis CSS.

| Pacote | Propósito e local de uso |
|---|---|
| `class-variance-authority` | Variantes de classes dos componentes shadcn, por exemplo em [`button.tsx`](../../../apps/client/src/components/ui/button.tsx). |
| `clsx`, `tailwind-merge` | Em [`cn()`](../../../apps/client/src/lib/utils.ts), compõem classes condicionais e resolvem conflitos entre classes Tailwind, respectivamente. |
| `tailwindcss-animate` | Utilitários de animação em [`tailwind.config.ts`](../../../apps/client/tailwind.config.ts). |
| `lucide-react` | Ícones de ações e estados, por exemplo em [`pagination.tsx`](../../../apps/client/src/components/ui/pagination.tsx). |
| `@phosphor-icons/react` | Ícones do [trilho de navegação por contexto](../../../apps/client/src/components/layout/AppContextRail.tsx). |
| `cmdk` | Lista pesquisável em [`command.tsx`](../../../apps/client/src/components/ui/command.tsx), usada pelo [`WorkCombobox`](../../../apps/client/src/components/common/WorkCombobox.tsx). |
| `vaul` | Painel deslizante em [`drawer.tsx`](../../../apps/client/src/components/ui/drawer.tsx), usado pelo [`ResponsiveDialog`](../../../apps/client/src/components/common/ResponsiveDialog.tsx). |
| `sonner` | Toasts centralizados em [`sonner.tsx`](../../../apps/client/src/components/ui/sonner.tsx) e montados em [`App.tsx`](../../../apps/client/src/App.tsx). |

### Primitivos Radix

Os arquivos da tabela ficam em [`src/components/ui/`](../../../apps/client/src/components/ui/).

| Pacotes | Propósito | Wrappers |
|---|---|---|
| `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog` | Diálogos modais e confirmações. | `dialog.tsx`, `sheet.tsx` e `command.tsx` usam Dialog. `alert-dialog.tsx` usa Alert Dialog. |
| `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip` | Menus de ações, painéis flutuantes e dicas. | `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`. |
| `@radix-ui/react-checkbox`, `@radix-ui/react-label`, `@radix-ui/react-radio-group`, `@radix-ui/react-select` | Caixas de seleção, rótulos, opções mutuamente exclusivas e seletores. | `checkbox.tsx`, `label.tsx`, `radio-group.tsx`, `select.tsx`. |
| `@radix-ui/react-switch`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group` | Interruptores, botões de alternância e seus grupos. | `switch.tsx`, `toggle.tsx`, `toggle-group.tsx`. O grupo reutiliza as variantes de `toggle.tsx`. |
| `@radix-ui/react-accordion`, `@radix-ui/react-collapsible`, `@radix-ui/react-tabs` | Seções expansíveis, conteúdo recolhível e abas. | `accordion.tsx`, `collapsible.tsx`, `tabs.tsx`. |
| `@radix-ui/react-avatar`, `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator` | Avatar com fallback, indicador de progresso, área rolável e divisor. | `avatar.tsx`, `progress.tsx`, `scroll-area.tsx`, `separator.tsx`. |
| `@radix-ui/react-slot` | Composição via `asChild`, repassando as propriedades para o elemento filho. | `button.tsx`, `breadcrumb.tsx` e `sidebar.tsx`. |

## Editor de descrição

| Pacote | Propósito e local de uso |
|---|---|
| `@tiptap/core` | API e tipos do editor, nós e marcas personalizados em [`descriptionBlocks.tsx`](../../../apps/client/src/components/tasks/description/descriptionBlocks.tsx). |
| `@tiptap/react` | Integração do editor com React, incluindo `useEditor` em [`TaskDescriptionEditor`](../../../apps/client/src/components/tasks/description/TaskDescriptionEditor.tsx). |
| `@tiptap/starter-kit`, `@tiptap/extensions` | Extensões básicas de edição e placeholder, respectivamente, em [`descriptionBlocks.tsx`](../../../apps/client/src/components/tasks/description/descriptionBlocks.tsx). |
| `@tiptap/extension-list`, `@tiptap/extension-table` | Listas de tarefas e tabelas em [`descriptionBlocks.tsx`](../../../apps/client/src/components/tasks/description/descriptionBlocks.tsx). |
| `@tiptap/extension-code-block-lowlight`, `lowlight` | Blocos de código e realce de sintaxe em [`descriptionBlocks.tsx`](../../../apps/client/src/components/tasks/description/descriptionBlocks.tsx). |
| `@tiptap/pm`, `@tiptap/suggestion` | Seleção via ProseMirror e menu aberto por `/` em [`DescriptionBlockMenu`](../../../apps/client/src/components/tasks/description/DescriptionBlockMenu.tsx). |
| `@tiptap/extension-drag-handle-react`, `@tiptap/extension-drag-handle` | Alça de arraste em [`DescriptionBlockMenu`](../../../apps/client/src/components/tasks/description/DescriptionBlockMenu.tsx). O wrapper React importa a extensão base, registrada no lockfile como peer. |
| `mermaid`, `dompurify` | Renderização de diagramas e sanitização do SVG, respectivamente, em [`MermaidPreview`](../../../apps/client/src/components/tasks/description/MermaidPreview.tsx). |

## Build, lint e testes

| Pacote | Propósito e local de uso |
|---|---|
| `vite` | Servidor de desenvolvimento, build e prévia da SPA. Veja os scripts do manifesto e [`vite.config.ts`](../../../apps/client/vite.config.ts). |
| `@vitejs/plugin-react-swc` | Transforma React e JSX via SWC no [Vite](../../../apps/client/vite.config.ts) e no [Vitest](../../../apps/client/vitest.config.ts). |
| `typescript` | Análise e tipos dos arquivos TS/TSX, configurados em [`tsconfig.app.json`](../../../apps/client/tsconfig.app.json) e [`tsconfig.node.json`](../../../apps/client/tsconfig.node.json). |
| `@types/react`, `@types/react-dom` | Declarações de tipos para componentes, JSX e renderização no [ponto de entrada](../../../apps/client/src/main.tsx). |
| `@types/node` | Declarações de tipos para as APIs Node usadas pelo [Vite](../../../apps/client/vite.config.ts) e pelos [testes E2E](../../../apps/client/e2e/). |
| `lovable-tagger` | Marca componentes para desenvolvimento em [`vite.config.ts`](../../../apps/client/vite.config.ts). |
| `tailwindcss` | Gera os utilitários CSS a partir do [tema](../../../apps/client/tailwind.config.ts) e da [folha global](../../../apps/client/src/index.css). |
| `postcss`, `autoprefixer` | Processamento CSS e inserção de prefixos, respectivamente, na cadeia de [`postcss.config.js`](../../../apps/client/postcss.config.js). |
| `eslint`, `@eslint/js`, `typescript-eslint` | Executável de lint e regras para JavaScript e TypeScript em [`eslint.config.js`](../../../apps/client/eslint.config.js). |
| `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | Regras de hooks e compatibilidade com Fast Refresh, além da lista de globais do navegador, em [`eslint.config.js`](../../../apps/client/eslint.config.js). |
| `vitest`, `jsdom` | Runner dos testes de unidade e componente e ambiente de DOM em [`vitest.config.ts`](../../../apps/client/vitest.config.ts). |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Renderização e consulta por acessibilidade, simulação de interação e matchers de DOM em [`src/__tests__/`](../../../apps/client/src/__tests__/) e [`src/test/setup.ts`](../../../apps/client/src/test/setup.ts). |
| `@playwright/test` | Testes ponta a ponta e regressão visual em [`e2e/`](../../../apps/client/e2e/), com [configuração funcional](../../../apps/client/playwright.config.ts) e [visual](../../../apps/client/playwright.visual.config.ts). |

## Declarações sem uso localizado

| Pacote | Propósito da biblioteca | Estado no Oriens |
|---|---|---|
| `@hookform/resolvers`, `zod` | Adaptadores de validação para React Hook Form e schemas de validação, respectivamente. | Sem referência no código ou na configuração. O lockfile registra Zod como peer opcional dos resolvers. |
| `@radix-ui/react-toast` | Primitivos de toast. | Sem referência no código ou na configuração. A SPA monta o toaster do Sonner. |
| `next-themes` | Gerenciamento de tema. | Sem referência no código ou na configuração. O [`SettingsContext`](../../../apps/client/src/context/SettingsContext.tsx) aplica o tema do usuário. |
| `react-intersection-observer` | Observação da visibilidade de elementos. | Sem referência no código ou na configuração. |
| `@tailwindcss/typography` | Plugin Tailwind para estilos de texto corrido. | Sem registro no [Tailwind](../../../apps/client/tailwind.config.ts) e sem uso de classes `prose` nas fontes. |

O Knip também apontou wrappers de [`src/components/ui/`](../../../apps/client/src/components/ui/)
que importam as bibliotecas abaixo. A busca por consumidores dos wrappers nas
entradas da aplicação e dos testes confirmou que eles estão isolados.

| Pacotes | Propósito | Wrappers sem consumidores |
|---|---|---|
| `@radix-ui/react-aspect-ratio`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card` | Proporção fixa, menu contextual e painel ao passar o ponteiro. | `aspect-ratio.tsx`, `context-menu.tsx`, `hover-card.tsx`. |
| `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-slider` | Barra de menus, menu de navegação e controle deslizante. | `menubar.tsx`, `navigation-menu.tsx`, `slider.tsx`. |
| `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `react-hook-form` | Carrossel, campo de código de uso único, painéis redimensionáveis e estado de formulários. | `carousel.tsx`, `input-otp.tsx`, `resizable.tsx`, `form.tsx`. |

Confira imports, configurações e relações do lockfile ao investigar um
alerta de uso. Os [testes do cliente](tests.md) registram como verificar as
mudanças na aplicação.
