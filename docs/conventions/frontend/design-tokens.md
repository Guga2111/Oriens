# Design system do Oriens

As decisões de tela estão na [spec de referência](../../specs/oriens-frontend-refactor.md) e no
[ADR do cliente](../../decisions/005-cliente.md). A [paleta vigente](../../plans/2026-11-22-design-system-plane-so-orange-design.md)
e o [guia da marca](../../brand/GUIA-DE-USO.md) documentam a identidade visual.

## Tokens de design e Tailwind

### Cores: só tokens semânticos

As variáveis HSL ficam em [`src/index.css`](../../../apps/client/src/index.css) e
o vínculo com as classes em [`tailwind.config.ts`](../../../apps/client/tailwind.config.ts).
`:root` define o tema claro, com cartões brancos sobre fundo cinza claro e
ação laranja de texto branco. A classe `.dark` mantém a hierarquia de superfícies
em cinza escuro, clareia a ação laranja e usa texto escuro sobre ela. A borda
de input tem mais contraste que o divisor nos dois temas. Aplique a classe
semântica da intenção conforme o catálogo.

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

❌ **Proibido**
- Hex/rgb/hsl literal em classe ou estilo: `text-[#781336]`, `style={{ color: '#fff' }}`, `hsl(350 28% 14%)`.
- Paleta crua do Tailwind: `bg-blue-500`, `text-gray-600`, `border-slate-200`, `text-white`, `bg-black/50`.
- `dark:` para trocar cor (`dark:bg-zinc-900`). O tema escuro é resolvido pelos tokens; se um token não
  basta, crie/ajuste o token nos dois temas.
- Opacidade como gambiarra de cor (`text-foreground/60` no lugar de `text-muted-foreground`).

**Automação** `eslint.config.js` aplica `no-restricted-syntax` (erro) fora de `src/components/ui/**` e dos
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

### Espaço, tamanho, raio, tipografia

- Espaçamento e tamanhos pela **escala do Tailwind** (`p-4`, `gap-3`, `size-8`, `h-11`). Layout de página
  usa os tokens do projeto: `px-page`, `p-overlay`, `max-h-dialog`, `max-w-task-dialog`, `w-board-column`,
  `grid-cols-project-detail`, `aspect-project-cover`.
- `rounded-lg` usa o raio base de 8 px. `rounded-md` e `rounded-sm`
  derivam 6 px e 4 px. `shadow-sheet` usa `--sheet-shadow` com opacidade
  maior no escuro. Use `shadow-md` ou `shadow-lg` dos primitivos para
  sobreposições como popover ou diálogo.
- Tipografia usa Inter com fallback sans do sistema. `text-page-title` é
  28 px com entrelinha de 36 px, `text-sm` é a escala usual de controle
  e `text-2xs` atende metadados compactos. Use `font-medium`/`font-semibold`
  para hierarquia e `tabular-nums` para colunas numéricas.
- Ícones: `lucide-react` na interface; no trilho de contextos, `@phosphor-icons/react` com
  `weight="fill"` para glifos preenchidos. Importe cada ícone Phosphor por `dist/csr/<Nome>` para
  evitar carregar o catálogo inteiro no desenvolvimento. Tamanho por classe (`size-4`), nunca SVG colado.

### Valores arbitrários (`[…]`)

| Situação | Aceito? |
|---|---|
| Seletores de estado Radix/shadcn: `data-[state=open]:…`, `data-[disabled]:…`, `group-data-[collapsible=icon]:…` | ✅ |
| Variáveis de runtime do Radix: `w-[var(--radix-popover-trigger-width)]` (já existe `w-popover-trigger`) | ✅ prefira o token |
| Medida de layout repetida: `max-w-[1120px]`, `min-[1100px]:`, `min-w-[8rem]` | ❌ crie token em `index.css` + `tailwind.config.ts` (como `--page-gutter`) ou use a escala/breakpoint padrão |
| Cor: `bg-[#…]`, `text-[hsl(…)]` | ❌ nunca |
| Valor único e justificado (ex.: cálculo com `calc()` de variável existente) | ⚠️ com comentário explicando |

### `style={{…}}`

Só para **valor dinâmico calculado em runtime** (posição de marcador em linha do tempo, largura percentual
de barra, cor de dado via CSS variable). Estilo estático vai em classe.

## Movimento e composição

Os primitivos usam transições por `data-state` com `tailwindcss-animate`.
O acordeão muda altura em 200 ms e o diálogo usa `duration-200`. Em movimento
próprio, respeite `prefers-reduced-motion`, conforme o CSS da landing e o
[guia de acessibilidade](tests.md).

| Padrão | Exemplos no cliente |
|---|---|
| Ação com escala comum | [`Button`](../../../apps/client/src/components/ui/button.tsx) define variantes via CVA. Use `asChild` quando a ação for um link. |
| Edição responsiva | [`ResponsiveDialog`](../../../apps/client/src/components/common/ResponsiveDialog.tsx) compõe Dialog no desktop e Drawer no mobile. [`TaskEditor`](../../../apps/client/src/components/tasks/TaskEditor.tsx) combina form, campos, variantes de ação e feedback. |
| Dados densos | [`ProjectBoard`](../../../apps/client/src/components/projects/ProjectBoard.tsx) compõe colunas com largura e estados próprios. Conserve rótulos e sinais além da cor. |
| Página pública | A [landing](../../../apps/client/src/pages/LandingPage.tsx) usa os tokens e a identidade do guia de marca. |

Use o [guia shadcn](components.md) para variantes e composição. Confira
hierarquia, foco, contraste e estados nos dois temas com as skills
[oriens-impeccable](../../../.agents/skills/oriens-impeccable/SKILL.md),
[oriens-design-taste](../../../.agents/skills/oriens-design-taste/SKILL.md) e
[oriens-playwright](../../../.agents/skills/oriens-playwright/SKILL.md).
A [regressão visual da #110](../../guides/visual-regression.md), executada no
[workflow visual](../../../.github/workflows/visual.yml), cobre landing,
editor e quadro em desktop e mobile.
