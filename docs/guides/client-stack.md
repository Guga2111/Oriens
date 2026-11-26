# Dependências do cliente

[`package.json`](../../apps/client/package.json) declara dependências diretas.
[`package-lock.json`](../../apps/client/package-lock.json) fixa as versões
resolvidas por `npm ci`. Em `apps/client`, `npm ls --depth=0` mostra a instalação.
O arquivo `bun.lockb` permanece versionado e o setup e CI usam npm.

## Aplicação

| Responsabilidade | Dependências | Uso |
|---|---|---|
| Aplicação e rotas | `react`, `react-dom`, `react-router-dom` | `src/main.tsx`, `src/App.tsx` e páginas |
| Estado de servidor e HTTP | `@tanstack/react-query`, `axios`, `jwt-decode` | `src/hooks/useWork.ts`, `src/services/api.ts` e sessão em `src/context/AuthContext.tsx` |
| Formulários | `react-hook-form`, `@hookform/resolvers`, `zod` | `src/components/ui/form.tsx` integra React Hook Form. A busca atual de código/configuração encontrou as outras duas no manifest e lockfile |
| Datas e agenda | `date-fns`, `react-day-picker` | Formatação no produto e calendário em `src/components/ui/calendar.tsx` |
| Mapas | `@react-google-maps/api` | `src/components/dashboard/LocationMap.tsx` |
| Arraste | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Quadro, ordenação e transformações CSS em `src/components/projects/` |
| Aparência | `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate` | Variantes shadcn, `cn()` de `src/lib/utils.ts` e animações em `tailwind.config.ts` |
| Ícones | `lucide-react`, `@phosphor-icons/react` | Controles e estados, com importações individuais Phosphor no trilho de contextos |
| Primitivos compostos | `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `vaul`, `sonner` | `src/components/ui/`, respectivamente command, carousel, input-otp, resizable, drawer e sonner |
| Gráficos | `recharts` | `src/components/ui/chart.tsx` e gráficos de estatísticas/finanças |
| Editor | `@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extensions`, `@tiptap/suggestion` | `src/components/tasks/description/`, base do editor, nós, transações e sugestões |
| Extensões do editor | `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-drag-handle`, `@tiptap/extension-drag-handle-react`, `@tiptap/extension-list`, `@tiptap/extension-table`, `lowlight` | Código com realce, alça de arraste, listas e tabelas do editor. `extension-drag-handle` é usado pela extensão React |
| Diagrama | `mermaid`, `dompurify` | Renderização e sanitização de SVG em `src/components/tasks/description/` |
| Entradas sem uso direto localizado | `next-themes`, `react-intersection-observer` | Manifest e lockfile. O seletor de tema vigente usa as preferências do Oriens |

### Radix nos primitivos shadcn

Os nomes abaixo têm prefixo `@radix-ui/react-`. Os wrappers ficam em
[`src/components/ui/`](../../apps/client/src/components/ui/).

| Uso | Pacotes |
|---|---|
| Sobreposições e ações | `alert-dialog`, `context-menu`, `dialog`, `dropdown-menu`, `hover-card`, `popover`, `tooltip` |
| Campos e alternância | `checkbox`, `label`, `radio-group`, `select`, `slider`, `switch`, `toggle`, `toggle-group` |
| Navegação e revelação | `accordion`, `collapsible`, `menubar`, `navigation-menu`, `tabs` |
| Apresentação e feedback | `aspect-ratio`, `avatar`, `progress`, `scroll-area`, `separator`, `toast` |
| Composição de elementos | `slot` em primitivas com `asChild` |

## Desenvolvimento e verificação

| Responsabilidade | Dependências | Uso |
|---|---|---|
| Vite e compilação | `vite`, `@vitejs/plugin-react-swc`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `lovable-tagger` | `vite.config.ts`, `tsconfig*.json` e marcação de componentes em modo desenvolvimento |
| CSS | `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/typography` | `tailwind.config.ts` e `postcss.config.js`. O plugin de tipografia está declarado e sem registro no Tailwind vigente |
| Lint | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | `eslint.config.js` |
| Testes rápidos | `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | `vitest.config.ts`, `src/test/setup.ts` e testes de unidade/componente |
| Navegador | `@playwright/test` | `playwright.config.ts`, `playwright.visual.config.ts` e `e2e/` |

Ausência de referência direta sinaliza investigação. Uma remoção requer
conferir dependências transitivas, uso indireto e build/testes em entrega própria.

- [Convenções do cliente](../conventions/frontend.md)
- [Setup e testes](setup.md#cliente)
