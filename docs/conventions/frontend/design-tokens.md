# Tokens de design e Tailwind

As decisões de tela estão na [spec de referência](../../specs/oriens-frontend-refactor.md). A [paleta vigente](../../plans/2026-11-22-design-system-plane-so-orange-design.md) e o [guia da marca](../../brand/GUIA-DE-USO.md) documentam a identidade visual.

## Tokens de design e Tailwind

### Cores: só tokens semânticos

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
- Raio: `rounded-lg`/`rounded-md`/`rounded-sm` (derivados de `--radius`). Não use `rounded-[10px]`.
- Tipografia: escala do Tailwind (`text-sm`, `text-base`, `text-2xl`) e pesos (`font-medium`,
  `font-semibold`). Números tabulares com `tabular-nums`.
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
