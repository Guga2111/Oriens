# Plano de design — migrar design system do Oriens para plane.so com primário laranja

**Data:** 2026-11-22 (v2: 2026-11-23)  
**Autor:** agente de código (OpenCode, v1) · Claude Code (validação e v2)  
**Status:** aprovada — em implementação  
**Branch:** `dev`  
**Substitui:** a paleta "Horizonte" de `docs/specs/oriens-frontend-refactor.md` (§9.1 e logo §11.11/D5)

**Histórico**
- v1 (2026-11-22): rascunho com abordagens e escopo; plane.so não inspecionado.
- v2 (2026-11-23): tokens do plane.so lidos em produção (§2); valores finais por tema com contraste
  medido (§5–§6); correções de logo, favicon, páginas públicas e conflitos de matiz.

## 1. Contexto

O usuário pediu que o design system do `oriens-front` replique o do
[plane.so](https://app.plane.so), com três mudanças:

1. Trocar o azul-petróleo (primário do plane.so) por **laranja** no botão primário e no design system.
2. Modificar o **SVG do logo do Oriens**.
3. Modificar o **favicon**.

A mudança de identidade visual foi **aprovada pelo usuário** (opção 3A) e substitui a paleta
"Horizonte" (bordô/creme/amarelo).

## 2. Referência: design system real do plane.so

**Método.** `agent-reach read https://app.plane.so` (backends jina e exa) devolve só o título e o
spinner: o app é uma SPA. Os tokens foram lidos do CSS público de produção servido pela página de
login (`/assets/globals-Ds_LDxdF.css`, deploy `dpl_6xheJ36WrtaFvjtaWeAykA5zUpfy`) e convertidos de
OKLCH para hex. O workspace `gugones` exige login e não foi aberto.

| Token do Plane | Claro | Escuro |
|---|---|---|
| `--brand-default` (botão primário) | ≈ #006399 | ≈ #2893CC |
| `--bg-canvas` | `neutral-300` ≈ #F2F2F3 | `neutral-black` ≈ #0F0F10 |
| `--bg-surface-1` (cartões, painéis) | branco | `neutral-100` ≈ #141415 |
| `--bg-layer-1-selected` (hover/seleção) | `neutral-400` ≈ #EAEBEC | `neutral-400` ≈ #222425 |
| `--txt-primary` | `neutral-1200` ≈ #0F0F10 | `neutral-1200` ≈ #E4E6E7 |
| `--txt-tertiary` | `neutral-1000` ≈ #494D50 | `neutral-1000` ≈ #AFB3B6 |
| `--border-subtle-1` | `neutral-500` ≈ #E1E2E3 | `neutral-500` ≈ #2C2E30 |
| Fonte | Inter Variable, regular 450 | — |
| Raios | `sm .25` · `md .375` · `lg .5rem` | — |

Observações:
- O primário do Plane é **azul-petróleo escuro**, não "azul elétrico". Ele usa um tom diferente por
  tema para manter a legibilidade; este plano faz o mesmo com o laranja.
- O Plane já suporta tema personalizado: toda a escala `--brand-*` vem de uma única cor base
  (`--custom-brand-base`). Trocar o azul por laranja é o mesmo movimento.
- Os neutros do Plane são cinzas frios quase sem matiz. O que dá a cara do Plane é essa base neutra
  mais um único acento; a base creme/bordô do Oriens é o que precisa sair.
- Os raios do Oriens já são iguais aos do Plane (`--radius: 0.5rem` → `lg .5rem`, `md 6px`, `sm 4px`).

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Primário laranja com **um tom por tema**: claro `21 92% 38%` (#BA4608) com texto branco; escuro `24 95% 55%` (#F9761F) com texto quase preto. | Um único laranja não passa AA com texto branco nos dois temas (`25 90% 50%` dá 3,02:1). |
| D2 | Neutros do Oriens passam a ser os do Plane (canvas cinza frio, cartão branco/quase preto, texto neutro). | É o que define o visual do Plane; manter o creme quente só trocaria a cor (abordagem B). |
| D3 | A família `--brand-*` (creme, bordô, amarelo) e `--background-brand` **saem**. A marca passa a viver em `--primary`. | Uma identidade, um acento. Páginas públicas e app ficam iguais, como no Plane. |
| D4 | Logo: sol em `fill-primary`, horizonte em `fill-foreground`. | Adapta-se aos dois temas sem token novo e passa 3:1 como objeto gráfico. |
| D5 | Favicon com hex literais que espelham os tokens, com troca por `prefers-color-scheme`. | O favicon é carregado isolado e não enxerga CSS do app. |
| D6 | `--now` claro escurece para `38 92% 30%`; o escuro mantém o valor do antigo amarelo da marca. | O canvas novo derrubaria "Hoje" (`text-now`) para 3,56:1. |
| D7 | Na `DayLine`, tarefa **em andamento** usa `bg-primary` e **concluída** usa `bg-muted-foreground`. | Laranja e `--now` têm a mesma luminância no claro (1,02:1); a marca "concluída" ficaria indistinguível da "em andamento" para daltônicos. Alinha com `TimelineBar` (andamento = primário, concluída = neutro). |

Abordagem: **C (híbrida)** da v1, agora concreta: base neutra do Plane + laranja como único acento,
sem reescrever shell, layout ou componentes shadcn.

## 4. Abordagens consideradas

| # | Abordagem | Trade-offs |
|---|---|---|
| A | Reescrever tudo no visual do Plane (shell, densidade, tipografia). | Fidelidade máxima; escopo grande e risco nas telas entregues. |
| B | Só trocar bordô por laranja, mantendo o creme "Horizonte". | Mínimo, mas não replica o Plane. |
| **C** | Tokens neutros do Plane + laranja; componentes intocados. | **Escolhida.** Replica o visual pelo sistema de tokens, que é onde o Oriens já centraliza cor. |

## 5. Design

### 5.1 Tokens semânticos (`src/index.css`)

Formato do projeto: HSL `H S% L%`. Hex só para referência.

| Token | Claro (atual → novo) | Escuro (atual → novo) |
|---|---|---|
| `--background` | `38 40% 95%` → **`240 4% 95%`** (#F2F2F3) | `350 18% 12%` → **`240 3% 6%`** (#0F0F10) |
| `--foreground` | `350 28% 14%` → **`240 3% 6%`** | creme → **`200 6% 90%`** (#E4E6E7) |
| `--card` | `38 50% 98.5%` → **`0 0% 100%`** | `350 17% 16%` → **`240 2% 8%`** (#141415) |
| `--primary` | bordô → **`21 92% 38%`** (#BA4608) | creme → **`24 95% 55%`** (#F9761F) |
| `--primary-foreground` | creme → **`0 0% 100%`** | bordô → **`240 3% 6%`** |
| `--secondary`, `--muted`, `--accent` | `36 32% 91%` → **`210 5% 92%`** (#EAEBEC) | `349 25% 22%` → **`200 4% 14%`** (#222425) |
| `--secondary-foreground`, `--accent-foreground` | bordô → **`var(--foreground)`** | creme → **`var(--foreground)`** |
| `--muted-foreground` | `15 17% 36%` → **`206 5% 30%`** (#494D50) | `30 24% 72%` → **`206 5% 70%`** (#AFB3B6) |
| `--border` | `33 24% 82%` → **`210 3% 89%`** (#E1E2E3) | `347 17% 30%` → **`210 4% 18%`** (#2C2E30) |
| `--input` | `var(--border)` → **`204 5% 80%`** (#CACDCF) | `var(--border)` → **`204 3% 28%`** (#45484A) |
| `--ring` | bordô → **`var(--primary)`** | amarelo → **`var(--primary)`** |
| `--chart-1` | bordô → **`var(--primary)`** | amarelo → **`var(--primary)`** |
| `--now` | `38 92% 36%` → **`38 92% 30%`** | `var(--brand-yellow)` → **`45.7 99.2% 52%`** (mesmo valor) |

Sem mudança: `--popover` (= card), `--card-foreground`/`--popover-foreground` (= foreground),
`--negative`, `--positive`, `--streak`, `--destructive*`, `--chart-2…5`, `--label-*`, `--radius`,
os mapeamentos `--sidebar-*` (seguem `--background`, `--primary`, `--ring`) e todos os tokens de
geometria.

`--input` deixa de ser igual a `--border` porque a borda do Plane (#E1E2E3 sobre branco, 1,29:1) é
mais fraca que a borda de campo atual (1,45:1). Com `--input` próprio, os campos ficam em 1,61:1
(claro) e 1,99:1 (escuro), sem piorar em relação a hoje. Os dois valores seguem abaixo de 3:1, uma
dívida que já existe (§10).

### 5.2 Tokens removidos

- `--brand-cream`, `--brand-burgundy`, `--brand-yellow` (`:root`).
- `--background-brand` (`:root` e `.dark`).
- Em `tailwind.config.ts`: as cores `brand.{cream,burgundy,yellow}` e `background-brand`.
- O comentário "Marca (inalterada — SPEC §9.1)" e os rótulos "§9.1" do `index.css` passam a apontar
  para este plano.

Depois da remoção, `rg "brand-(cream|burgundy|yellow)|background-brand" oriens-front/src` deve vir vazio.

### 5.3 Botão primário (`src/components/ui/button.tsx`)

Sem mudança. O variant `default` consome `bg-primary text-primary-foreground hover:bg-primary/90`.

### 5.4 Logo (`src/components/common/OriensLogo.tsx`)

Mesmo desenho (`viewBox 0 0 48 48`, sol + quatro linhas de horizonte) e mesma acessibilidade
(`role="img"` com `title`; `aria-hidden` sem `title`).

- Sol (`<path>`): `fill-brand-yellow` → **`fill-primary`**.
- Quatro `<rect>`: `fill-brand-burgundy` → **`fill-foreground`**.
- JSDoc: descrever "sol no primário, horizonte na cor do texto" e citar este plano.

Não usar `fill-[hsl(var(--primary))]`: casa com `ARBITRARY_COLOR` em `eslint.config.js:33` e
quebra o lint.

### 5.5 Favicon (`public/favicon.svg`)

Mesmo desenho e atributos (`viewBox`, `role="img"`, `aria-label="Oriens"`). Cores por classe com
`<style>` interno, espelhando os tokens:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="Oriens">
  <style>
    .sun { fill: #BA4608 } .line { fill: #0F0F10 }
    @media (prefers-color-scheme: dark) { .sun { fill: #F9761F } .line { fill: #E4E6E7 } }
  </style>
  <path class="sun" d="M9 24a15 15 0 0 1 30 0Z" />
  <rect class="line" x="5" y="22.5" width="38" height="3" rx="1.5" />
  <rect class="line" x="11" y="29" width="26" height="3" rx="1.5" />
  <rect class="line" x="15" y="35.5" width="18" height="3" rx="1.5" />
  <rect class="line" x="19" y="42" width="10" height="3" rx="1.5" />
</svg>
```

Os hex literais são exceção documentada: arquivos em `public/` não passam pelo lint, e o favicon não
tem acesso às variáveis CSS. Se os tokens de §5.1 mudarem, o favicon muda junto.

### 5.6 Páginas públicas

`bg-background-brand` → **`bg-background`** em `LandingPage.tsx` (2×), `SignLoginPage.tsx`,
`ResetPasswordPage.tsx`, `NotFoundPage.tsx` e `TermsOfServicePage.tsx`.

Seção `#features-detail` de `LandingPage.tsx` (faixa bordô hoje), que vira uma faixa no primário:

| Hoje | Novo |
|---|---|
| `bg-brand-burgundy … text-brand-cream` | `bg-primary … text-primary-foreground` |
| `text-brand-cream/80`, `/75`, `/70` (texto) | `text-primary-foreground` (sem opacidade, frontend.md §3: opacidade não substitui cor) |
| `bg-brand-cream/5`, `/10` (moldura decorativa, `aria-hidden`) | `bg-primary-foreground/5`, `/10` |
| `bg-brand-cream/40` (marcas decorativas) | `bg-primary-foreground/40` |
| `bg-brand-yellow` (marca em destaque) | `bg-primary-foreground` |
| `<Badge className="border-brand-yellow/60 bg-brand-yellow/15 text-brand-yellow">` | `<Badge variant="secondary">` |

O texto da faixa fica em 5,29:1 (claro) e 7,01:1 (escuro).

### 5.7 `DayLine` (`src/components/dashboard/DayLine.tsx:105`)

Marcador de tarefa: `CONCLUDED ? 'bg-primary' : ON_DOING ? 'bg-now' : 'bg-foreground/40'` →
**`CONCLUDED ? 'bg-muted-foreground' : ON_DOING ? 'bg-primary' : 'bg-foreground/40'`** (D7).
A linha do "agora" continua `bg-now`. O status segue também no `aria-label` e no `title`.

### 5.8 Pré-paint (`index.html`)

Trocar `hsl(38 40% 95%)` → `hsl(240 4% 95%)` e `hsl(350 18% 12%)` → `hsl(240 3% 6%)` nas quatro
regras. O comentário passa a citar este plano.

### 5.9 Documentação

- `docs/conventions/frontend.md`: linha 7 ("paleta Horizonte") passa a apontar para este plano; a
  linha "Marca (páginas públicas)" da tabela de intenções (linha 152) sai, porque a marca agora é
  `bg-primary`/`text-primary`.
- `docs/specs/oriens-frontend-refactor.md`: nota no topo de §9.1 e de §11.11/D5 dizendo que
  paleta e logo foram substituídos por este plano.

## 6. Contraste medido (WCAG 2.x)

Valores calculados a partir dos tokens de §5.1. Texto exige 4,5:1; objetos gráficos e foco, 3:1.

| Par | Claro | Escuro |
|---|---|---|
| `foreground` / `background` | 17,11 | 15,32 |
| `foreground` / `card` | 19,18 | 14,71 |
| `primary-foreground` / `primary` (botão, faixa pública) | 5,29 | 7,01 |
| `primary` / `background` (`text-primary`, anel de foco, sol do logo) | 4,71 | 7,01 |
| `primary` / `card` | 5,29 | 6,73 |
| `card` / `chart-1` (`.habit-DONE`) | 5,29 | 6,73 |
| `muted-foreground` / `background` | 7,61 | 9,08 |
| `muted-foreground` / `muted` | 7,13 | 7,36 |
| `foreground` / `muted` (secondary, accent) | 16,01 | 12,42 |
| `now` / `background` ("Hoje") | 4,82 | 11,99 |
| `input` / `card` (borda de campo) | 1,61 (hoje 1,45) | 1,99 (hoje 1,62) |
| `primary` / `now` (luminância) | 1,02 | 1,71 |

A última linha motiva D7: no tema claro, laranja e `--now` só se distinguem pela matiz (OKLCH ~42°
vs ~71°). Onde os dois aparecem juntos com formas diferentes (barra "em andamento" da linha do
tempo e linha vertical "hoje"), a forma resolve.

## 7. Fora de escopo

- Peso de fonte 450 do Plane: os componentes shadcn fixam `font-normal`/`font-medium` (400/500), e
  um peso no `body` se aplicaria de forma desigual.
- Densidade, sidebar, layout e shell. A sidebar segue `--background`/`--primary` pelos mapeamentos atuais.
- `--label-*` (cores de dados das etiquetas), `--chart-2…5`, `--positive`, `--negative`, `--streak`.
- Ícones PWA/manifest e meta `theme-color` (não existem hoje).
- Contrato de API, rotas, regras de negócio, dependências novas, Tailwind v4, troca de Radix.

## 8. Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `oriens-front/src/index.css` | §5.1 e §5.2 |
| `oriens-front/tailwind.config.ts` | Remove `brand` e `background-brand` |
| `oriens-front/src/components/common/OriensLogo.tsx` | §5.4 |
| `oriens-front/public/favicon.svg` | §5.5 |
| `oriens-front/src/pages/{Landing,SignLogin,ResetPassword,NotFound,TermsOfService}Page.tsx` | §5.6 |
| `oriens-front/src/components/dashboard/DayLine.tsx` | §5.7 |
| `oriens-front/index.html` | §5.8 |
| `docs/conventions/frontend.md`, `docs/specs/oriens-frontend-refactor.md` | §5.9 |
| `oriens-front/src/__tests__/` | Testes de §9 |

## 9. Critérios de aceitação

- [ ] Tokens de §5.1 aplicados em `:root` e `.dark`, sem hex/rgb/hsl literal fora de `index.css`.
- [ ] `rg "brand-(cream|burgundy|yellow)|background-brand" oriens-front/src oriens-front/tailwind.config.ts` vazio.
- [ ] Botão primário laranja nos dois temas, sem mudança em `button.tsx`.
- [ ] Logo com `fill-primary` (sol) e `fill-foreground` (linhas); com `title`, `role="img"` e `<title>`; sem `title`, `aria-hidden`.
- [ ] Favicon conforme §5.5, com os valores de §5.1.
- [ ] Faixa `#features-detail` sem opacidade em texto; badge "Em breve" com `variant="secondary"`.
- [ ] `DayLine`: concluída `bg-muted-foreground`, em andamento `bg-primary`.
- [ ] Pré-paint do `index.html` igual a `--background` nos dois temas (sem flash ao carregar).
- [ ] Contrastes de §6 conferidos nos dois temas.
- [ ] Testes novos/ajustados:
  - `OriensLogo`: classes `fill-primary`/`fill-foreground` e as duas variantes de acessibilidade.
  - `DayLine`: classe do marcador por status (falha com o mapeamento antigo).
- [ ] `npm run lint`, `npm test` e `npm run build` passando.
- [ ] Revisão visual (claro e escuro) de: landing, login, 404, dashboard (`DayLine`, `WeekView`),
  projeto (kanban e linha do tempo), estatísticas (atividade e hábitos), financeiro (gráficos).

## 10. Riscos e dívidas

- **Bordas de campo abaixo de 3:1** (WCAG 1.4.11): já é assim hoje e no Plane. Este plano não piora
  (§5.1); a correção fica para outra entrega.
- **Laranja vs `--now` no claro** (mesma luminância): mitigado por D7. Outros pares só por cor devem
  aparecer na revisão visual.
- **Etiquetas `label-*` com matiz quente** (ex.: `--label-gray: 30 10% 90%`) podem destoar dos neutros
  frios. São dados e ficam como estão; reavaliar na revisão visual.
- **Favicon duplica valores dos tokens**: mudança de §5.1 exige mudança manual em `public/favicon.svg`.

## 11. Implementação

Um PR para `dev`: `feat(design): adopt plane.so neutral palette with orange primary`.

1. `index.css` e `tailwind.config.ts` (§5.1, §5.2).
2. `OriensLogo.tsx`, `favicon.svg`, `index.html` (§5.4, §5.5, §5.8).
3. Páginas públicas e `DayLine` (§5.6, §5.7), com os testes de §9.
4. Documentação (§5.9).
5. `npm run lint && npm test && npm run build`; revisão visual com `npm run dev` nos dois temas;
   evidência em `docs/plans/AAAA-MM-DD-design-system-plane-so-orange-evidence.md`.

O MCP `oriens` está configurado (`.mcp.json`, commit `8467725`). Depois da aprovação, a entrega pode
ser registrada como tarefa no objetivo do Oriens.
