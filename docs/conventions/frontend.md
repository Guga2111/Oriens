# Frontend — padrões e antipadrões (`oriens-front`)

Stack: Vite 5 · React 18 · TypeScript · Tailwind CSS 3 · shadcn/ui (Radix, estilo `default`, base `slate`,
CSS variables) · TanStack Query 5 · Axios · date-fns · lucide-react · recharts · sonner · Vitest +
Testing Library · Playwright.

Decisões visuais (paleta Horizonte, tipografia, densidade, telas) estão em
[docs/specs/oriens-frontend-refactor.md](../specs/oriens-frontend-refactor.md) §8–§13. Este guia trata de
**como escrever o código**; a spec trata de **o que a tela deve ser**.

Sumário: [1. Estrutura](#1-estrutura-de-pastas) · [2. shadcn primeiro](#2-shadcn-primeiro) ·
[3. Tokens e Tailwind](#3-tokens-de-design-e-tailwind) · [4. Componentes](#4-componentes-react) ·
[5. Dados](#5-dados-servidor-e-cache) · [6. Formulários](#6-formulários) · [7. Acessibilidade](#7-acessibilidade) ·
[8. TypeScript](#8-typescript) · [9. Testes](#9-testes) · [10. Dívida conhecida](#10-dívida-conhecida)

---

## 1. Estrutura de pastas

```
src/
  components/ui/          shadcn: gerado pelo CLI. Só edite para adaptar a tokens/variantes do Oriens.
  components/common/      Composições reutilizáveis do produto (PageHeader, ResponsiveDialog, ConfirmDialog,
                          WorkFeedback, WorkCombobox, WorkDatePicker, WorkSelect…)
  components/<domínio>/   tasks, projects, financial, statistics, dashboard, settings, layout…
  pages/                  Uma por rota; compõe componentes, não contém regra de negócio extensa
  hooks/                  useWork, useStatistics, useTaskLabels…: queries, mutações e estado derivado
  services/               Chamadas HTTP (axios, `services/api.ts`); sem estado nem React
  lib/                    Funções puras: datas, dinheiro, formatação, validação de formulário, rótulos
  types/                  Tipos dos contratos da API
  context/                Auth e Settings (estado global mínimo)
  __tests__/              Testes Vitest
```

Regra de dependência: `pages → components → hooks → services → api`. `lib/` e `types/` podem ser usados
por todos. Componente nunca importa `axios` nem `services/api` diretamente.

---

## 2. shadcn primeiro

### 2.1 A regra

**A UI do Oriens não usa primitivos HTML crus para nada que tenha equivalente no shadcn.** Todo controle
interativo, de formulário, de sobreposição ou de dados vem de `@/components/ui` (ou de uma composição em
`components/common` construída sobre eles). Motivo: foco, teclado, ARIA, estados (`disabled`,
`data-[state]`), tema escuro e tokens já vêm resolvidos e consistentes.

| ❌ Não use | ✅ Use |
|---|---|
| `<button>` | `Button` (`variant`: default, secondary, outline, ghost, link, destructive; `size`: default, sm, lg, icon) |
| `<button>` como gatilho de Popover/Tooltip/Dropdown | `<PopoverTrigger asChild><Button variant="ghost">…` |
| `<input>` | `Input`; `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `InputOTP` conforme o tipo |
| `<input type="date">` | `WorkDatePicker` (Popover + `Calendar`) |
| `<input type="file">` | `Input type="file"` ou `Button` que aciona um `Input` oculto com `Label` |
| `<select>` | `Select` (lista curta), `WorkSelect`, `WorkCombobox` (`Command` + `Popover`, lista longa/buscável) |
| `<textarea>` | `Textarea` |
| `<label>` | `Label` / `FieldLabel` |
| `<fieldset>` / `<legend>` | `FieldSet` / `FieldLegend` |
| texto de erro solto | `FieldError` dentro de `Field data-invalid` |
| `<table>` | `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` |
| `<dialog>`, modal feito à mão | `Dialog` / `AlertDialog` / `Sheet` / `Drawer` — no produto, `ResponsiveDialog` e `ConfirmDialog` |
| `window.confirm` / `alert` | `ConfirmDialog` / `AlertDialog` |
| tooltip com `title=""` | `Tooltip` |
| menu feito com `div` + estado | `DropdownMenu`, `ContextMenu`, `Menubar` |
| abas feitas à mão | `Tabs` ou `ToggleGroup` |
| `<hr>` | `Separator` |
| `<progress>` | `Progress` |
| `<img>` de usuário | `Avatar` (`AvatarImage` + `AvatarFallback`) |
| `<img>` de capa | `AspectRatio` + `img` com `alt` |
| spinner/“Carregando…” à mão | `Spinner`, `Skeleton` |
| estado vazio à mão | `Empty` |
| caixa de aviso à mão | `Alert` (no produto, `WorkFeedback` para erros de API) |
| toast próprio | `toast` do `sonner` |
| `<a href="/rota">` | `Link` do react-router; com aparência de botão: `<Button asChild><Link to="…">` |
| `<a href="https://…">` | `<Button asChild variant="link"><a href rel="noopener noreferrer" target="_blank">` |

**Permitido**: elementos de estrutura e texto sem comportamento — `div`, `section`, `header`, `main`,
`nav`, `aside`, `footer`, `article`, `ul`/`ol`/`li`, `p`, `h1`–`h6`, `span`, `strong`, `time`, `form`
(com `Field*` dentro). Prefira o elemento semântico correto a `div`.

### 2.2 Quando o componente não existe

Ordem de busca:

1. **Já está em `src/components/ui/` ou `components/common/`?** Use. Não crie um segundo combobox, dialog
   ou date picker.
2. **Existe no shadcn/ui oficial?** Adicione pelo CLI (veja a skill/MCP do shadcn se estiver usando um agente):
   ```sh
   npx shadcn@latest add <componente> --dry-run   # veja o que será criado/alterado
   npx shadcn@latest add <componente> --diff      # se tocar em arquivos existentes
   npx shadcn@latest add <componente>
   ```
   Nunca use `--overwrite` em `components/ui` sem aprovação: os arquivos já foram adaptados aos tokens.
3. **Existe no ecossistema da comunidade em [shadcn.io](https://www.shadcn.io)?** Consultar e usar é
   permitido, com estas condições:
   - **Licença** declarada e compatível (MIT ou equivalente). Itens **Pro/pagos** ou sem licença declarada
     servem só como referência de ideia — não copie o código.
   - **Sem dependência nova pesada** sem aprovação (ex.: componentes de gráfico do shadcn.io usam outra lib
     de charts; no Oriens, gráficos são **recharts** via `ui/chart.tsx`).
   - Deve ser **Radix + Tailwind 3**, compatível com React 18. Variante Base UI ou Tailwind 4 exige adaptação.
   - Depois de instalar, **adapte aos tokens** (remova hex, paleta crua e medidas arbitrárias) e aos textos
     em pt-BR. O shadcn.io não é afiliado ao shadcn/ui oficial: revise o código como código de terceiros.
   - Registre a origem (URL) no PR.
4. **Nada serve?** Componha a partir dos primitivos shadcn (`Button`, `Popover`, `Command`…) em
   `components/common/` (genérico) ou `components/<domínio>/` (específico).
5. **Exceção real** (ex.: célula de matriz com semântica de grade, marcador posicionado em linha do
   tempo): é permitido elemento nativo **se** nenhum componente shadcn atender, com estilos só de token,
   foco visível e nome acessível. Marque a linha com a desativação do ESLint, sempre com motivo:
   ```tsx
   // eslint-disable-next-line no-restricted-syntax -- shadcn-exception: <motivo>
   {/* eslint-disable-next-line no-restricted-syntax -- shadcn-exception: <motivo> */}  // dentro de JSX
   ```
   O texto `shadcn-exception` torna a exceção buscável (`grep -rn shadcn-exception src`) e revisável.
   Exceções atuais: marcador da `DayLine` e célula do `ActivityCalendar`.

### 2.3 Variantes, não classes soltas

Diferenças visuais recorrentes viram **variante** (`cva`) no componente, não `className` repetido:

```tsx
// ❌ cópia do mesmo estilo em 6 lugares
<Button className="h-8 px-2 text-xs text-muted-foreground hover:bg-transparent">…</Button>

// ✅ variante/size definido uma vez em ui/button.tsx (ou um componente em common/)
<Button variant="ghost" size="sm">…</Button>
```

`className` no uso serve para **layout** (posição, margem externa, largura em grid), não para redesenhar o
componente. Combine classes com `cn()` de `@/lib/utils`, nunca concatenando strings.

---

## 3. Tokens de design e Tailwind

### 3.1 Cores: só tokens semânticos

Os tokens estão em `src/index.css` (`:root` e `.dark`) e mapeados em `tailwind.config.ts`. Use **a intenção**,
não a cor:

| Intenção | Classes |
|---|---|
| Superfície e texto | `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-popover` |
| Texto secundário | `text-muted-foreground`; fundo neutro `bg-muted` |
| Ação principal | `bg-primary text-primary-foreground` (via `Button`) |
| Ação secundária / hover | `bg-secondary`, `bg-accent text-accent-foreground` |
| Erro / destrutivo | `text-destructive`, `bg-destructive text-destructive-foreground` |
| Dado financeiro | `text-positive`, `text-negative` |
| Dados específicos | `text-streak`, `text-now`, `bg-label-<cor>` + `text-label-<cor>-foreground` |
| Gráficos | `chart-1` … `chart-5` (via `ChartConfig` do `ui/chart.tsx`) |
| Bordas e foco | `border-border`, `border-input`, `ring-ring` |
| Marca (páginas públicas) | `bg-background-brand`, `brand-cream`, `brand-burgundy`, `brand-yellow` |

❌ **Proibido**
- Hex/rgb/hsl literal em classe ou estilo: `text-[#781336]`, `style={{ color: '#fff' }}`, `hsl(350 28% 14%)`.
- Paleta crua do Tailwind: `bg-blue-500`, `text-gray-600`, `border-slate-200`, `text-white`, `bg-black/50`.
- `dark:` para trocar cor (`dark:bg-zinc-900`). O tema escuro é resolvido pelos tokens; se um token não
  basta, crie/ajuste o token nos dois temas.
- Opacidade como gambiarra de cor (`text-foreground/60` no lugar de `text-muted-foreground`).

**Automação**: `eslint.config.js` aplica `no-restricted-syntax` (erro) fora de `src/components/ui/**` e dos
testes:
1. JSX `button`, `input`, `select`, `textarea`, `table`, `dialog` e `label`.
2. Strings e template literals com classe de paleta crua (`bg-blue-500`, `text-white/80`, `dark:bg-zinc-900`…) ou
   com cor arbitrária (`[#…]`, `[rgb(…)]`, `[hsl(…)]`).

`a` e `img` não são bloqueados no lint, porque aparecem legitimamente em `Button asChild`, `Avatar` e
`AspectRatio`. Rota interna continua devendo usar `Link`. Hex solto fora de classe (ex.: cor padrão de um dado)
não é detectado: use uma constante nomeada em `lib/`, como `DEFAULT_TAG_COLOR` em `lib/financial-tags.ts`.

**Token novo**: adicione a variável em `:root` **e** `.dark` em `src/index.css` (formato `H S% L%`), mapeie em
`tailwind.config.ts`, confira contraste AA nos dois temas e documente o uso em comentário curto. Mudança de
identidade visual precisa de aprovação.

**Cores vindas de dados** (cor de tag financeira escolhida pelo usuário, cor de projeto) não são tokens: são
dados. Passe-as por CSS variable e use a classe para aplicar:

```tsx
<span className="size-2 rounded-full bg-[var(--tag)]" style={{ '--tag': tag.color } as React.CSSProperties} />
```

Valores padrão dessas cores ficam em uma constante nomeada em `lib/`, não repetidos como literal.

### 3.2 Espaço, tamanho, raio, tipografia

- Espaçamento e tamanhos pela **escala do Tailwind** (`p-4`, `gap-3`, `size-8`, `h-11`). Layout de página
  usa os tokens do projeto: `px-page`, `p-overlay`, `max-h-dialog`, `max-w-task-dialog`, `w-board-column`,
  `grid-cols-project-detail`, `aspect-project-cover`.
- Raio: `rounded-lg`/`rounded-md`/`rounded-sm` (derivados de `--radius`). Não use `rounded-[10px]`.
- Tipografia: escala do Tailwind (`text-sm`, `text-base`, `text-2xl`) e pesos (`font-medium`,
  `font-semibold`). Números tabulares com `tabular-nums`.
- Ícones: `lucide-react`, tamanho por classe (`size-4`), nunca SVG colado.

### 3.3 Valores arbitrários (`[…]`)

| Situação | Aceito? |
|---|---|
| Seletores de estado Radix/shadcn: `data-[state=open]:…`, `data-[disabled]:…`, `group-data-[collapsible=icon]:…` | ✅ |
| Variáveis de runtime do Radix: `w-[var(--radix-popover-trigger-width)]` (já existe `w-popover-trigger`) | ✅ prefira o token |
| Medida de layout repetida: `max-w-[1120px]`, `min-[1100px]:`, `min-w-[8rem]` | ❌ crie token em `index.css` + `tailwind.config.ts` (como `--page-gutter`) ou use a escala/breakpoint padrão |
| Cor: `bg-[#…]`, `text-[hsl(…)]` | ❌ nunca |
| Valor único e justificado (ex.: cálculo com `calc()` de variável existente) | ⚠️ com comentário explicando |

### 3.4 `style={{…}}`

Só para **valor dinâmico calculado em runtime** (posição de marcador em linha do tempo, largura percentual
de barra, cor de dado via CSS variable). Estilo estático vai em classe.

---

## 4. Componentes React

✅ **Padrão**
- Componentes de função, nomeados (`export function TaskRow`), um componente principal por arquivo, arquivo
  com o mesmo nome em PascalCase.
- Props tipadas com `type`/`interface` explícito; sem `React.FC`.
- Componente pequeno e com um propósito. Passou de ~200 linhas ou mistura busca de dados + layout + regra?
  Extraia hook (`hooks/`) ou função pura (`lib/`).
- Estado derivado é **calculado**, não sincronizado com `useEffect` + `setState`.
- Listas com `key` estável (ID do domínio), nunca índice quando a lista reordena.
- Textos de UI em pt-BR; rótulos de enum vêm de `lib/labels.ts` (`TASK_STATUS`…), não repetidos.
- Datas com `date-fns` e helpers de `lib/date.ts`/`lib/product-time.ts`; "hoje" do produto via
  `useProductToday`/`productNow`, nunca `new Date()` espalhado. Dinheiro via `lib/money.ts`.
- Carregando / vazio / erro **sempre** tratados: `Skeleton`/`Spinner`, `Empty`, `WorkFeedback` com
  "Recarregar dados".

❌ **Antipadrões**
- `useEffect` para buscar dados (use TanStack Query) ou para copiar prop em estado.
- Prop drilling de 3+ níveis para dado de servidor — leia pelo hook de query onde precisa (o cache é
  compartilhado).
- Contexto novo para dado de servidor (Context é para Auth/Settings).
- `console.log` / `console.error` deixado no código (inclusive em `services/`).
- Componentes gigantes com JSX denso em uma linha só; quebre por legibilidade.
- Lógica de negócio duplicada entre front e back (ex.: recalcular status de atraso de forma diferente da API).

---

## 5. Dados: servidor e cache

Fluxo: **`services/*Service.ts`** (HTTP, tipado, recebe `AbortSignal`) → **hook em `hooks/`** (`useQuery`/
`useMutation` com chave de `workKey`) → **componente**.

✅ **Padrão** (`hooks/useWork.ts`):

```ts
export const workKey = (user: number | null, family: string, ...params: unknown[]) =>
  ['work', user, family, ...params] as const;

export function useTaskDay(date: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: workKey(userId, 'tasks/day', date),
    enabled: userId !== null && enabled,
    queryFn: ({ signal }) => taskService.day(userId!, date, signal),
  });
}
```

Regras:
- **Chave de query sempre por `workKey`**, com o usuário na chave (troca de conta não reaproveita cache).
- **Mutação invalida/atualiza** as chaves afetadas no próprio hook (`setQueryData` do detalhe +
  `invalidateQueries` com predicado), não no componente.
- **Concorrência**: escritas enviam a `version` lida (`If-Match`); 409 mostra a mensagem de `workError` e
  **preserva o rascunho** do usuário.
- **Criação** usa `useCreationAttempt` (mesma `Idempotency-Key` em reenvio).
- **Erros de API** passam por `workError` (`lib/work-form.ts`) e aparecem com `WorkFeedback` ou no `FieldError`
  do campo indicado por `fieldErrors`.
- Respostas de `/task` e `/project` são verificadas por `assertWorkIdentity` no interceptor; não remova.

❌ **Antipadrões**
- `axios`/`fetch` dentro de componente ou página.
- Chave de query escrita à mão (`['tasks', id]`) — some da invalidação e gera dados velhos.
- Filtrar/ordenar/paginar no cliente uma lista que a API pagina.
- **N+1 no front**: buscar detalhes item a item em laço (`tasks.map(t => useTaskDetail(t.id))` ou
  `Promise.all(ids.map(get))`). Se a tela precisa de dados agregados, a API deve devolvê-los em lote — peça
  o endpoint.
- Confiar no front para autorização. Esconder um botão é UX; a garantia é do backend.
- Guardar no `localStorage` qualquer coisa além do token e preferências já existentes.

---

## 6. Formulários

✅ **Padrão** (ex.: `TaskEditor`, diálogos financeiros):
- Layout com `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldSet`/`FieldLegend`.
- `<form noValidate onSubmit={…}>` e `<fieldset disabled={pending}>` durante envio; botão de envio com estado
  de carregando.
- Validação em funções puras e testadas em `lib/<domínio>-form.ts` (ex.: `validCalendarDate`), espelhando as
  regras da API; a API continua sendo a autoridade.
- Erro de campo: `Field data-invalid` + `aria-invalid` no controle + `FieldError` com a mensagem.
- Diálogos de edição usam `ResponsiveDialog` (Dialog no desktop, Drawer no mobile) e `DraftDialog` quando
  há rascunho a proteger.

❌ **Antipadrões**
- Validação só no `onClick` do botão, sem `form`/submit (quebra Enter e leitores de tela).
- Mensagem de erro genérica no topo quando a API disse qual campo falhou.
- Dois estilos de formulário no mesmo fluxo (estado controlado em um campo e `react-hook-form` em outro).

---

## 7. Acessibilidade

Mínimo para todo componente:
- Operável só com teclado; foco visível (`ring-ring`); ordem de foco lógica; `Esc` fecha sobreposições.
- Todo controle com nome acessível (`Label` associado, `aria-label` em botão só de ícone, `sr-only` quando
  necessário).
- Contraste AA nos dois temas (tokens já calibrados — por isso não use cor fora deles).
- Sem informação só por cor (status com texto/ícone além da cor).
- Atualizações assíncronas relevantes com `role="status"`/`aria-live`; erros com `role="alert"`.
- Respeite `prefers-reduced-motion` em animações próprias.

---

## 8. TypeScript

O `tsconfig` ainda é permissivo (`strict: false`) por histórico. **Código novo escreve como se fosse strict**:
- Sem `any` (use `unknown` + estreitamento); sem `as` para silenciar o compilador.
- Tipos de contrato da API em `types/` e reaproveitados (não redeclare `Task` dentro do componente).
- Uniões literais para estados (`'PENDING' | 'ON_DOING' | …`), não `string`.
- Não use `!` (non-null) fora do padrão `enabled: userId !== null` + `userId!` no `queryFn`.

---

## 9. Testes

- **Vitest + Testing Library** em `src/__tests__/`: teste comportamento visível (papel, nome acessível, texto),
  não detalhes de implementação. Prefira `getByRole('button', { name: … })` a `getByTestId`.
- Toda regra em `lib/` tem teste unitário.
- Componente com estado de carregando/vazio/erro tem teste dos três.
- Bug corrigido ganha teste que falhava antes.
- **Playwright** (`e2e/`) para fluxos ponta a ponta críticos (criar/editar/concluir tarefa, projeto, financeiro).
- Rode `npm run lint && npm test` antes de abrir PR.

---

## 10. Dívida conhecida

Levantamento de 2026-11-16 (fora de `components/ui/`). Não copie estes padrões; ao tocar no arquivo por
outro motivo, não amplie o problema.

| Onde | Problema |
|---|---|
| `components/layout/AppSidebar.tsx` (`#ccc`), `components/projects/CreateProjectDialog.tsx` (`#808080`) | Cor padrão de dado como literal → constante nomeada em `lib/` |
| Vários (`max-w-[1120px]`, `max-w-[640px]`, `min-[1100px]:`, `min-w-[8rem]`, `xl:grid-cols-[…]`…) | Medidas arbitrárias repetidas → tokens |
| 19 usos de `style={{…}}` | Revisar quais são estáticos |
| `services/settingsService.ts`, `TaskRow`, `FinancialPage`, `SignLoginPage`, contextos | `console.error` deixado no código |
| `components/statistics/ActivityStreak.tsx` | `title=""` usado como tooltip → `Tooltip` |
| `tsconfig.app.json` | `strict: false`, `noImplicitAny: false` |
| `src/__tests__/task-labels.test.tsx`, `project-detail-a9-dialogs.test.tsx` | Instáveis sob carga (timeout de 5 s) |

**Resolvido em 2026-11-16** (branch `fix/security-and-ui-conventions`): regras de ESLint de §3.1; migração de
todos os `<button>`, `<input>`, `<select>`, `<label>` e `<table>` crus para shadcn (restam só as duas exceções
documentadas em §2.2); `<a href="/terms">` → `Link`; cor padrão de tag em `DEFAULT_TAG_COLOR`; `console.error`
removido de `services/api.ts`.
