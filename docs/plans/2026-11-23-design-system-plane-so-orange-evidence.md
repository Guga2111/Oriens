# Evidência — design system plane.so com primário laranja

**Data:** 2026-11-23  
**Spec:** [2026-11-22-design-system-plane-so-orange-design.md](2026-11-22-design-system-plane-so-orange-design.md) (v2, aprovada)  
**Branch:** `feat/design-plane-orange` → PR para `dev`

## 1. O que foi entregue

| Etapa (§11) | Commit | Arquivos |
|---|---|---|
| Spec com status "aprovada — em implementação" | `docs(design): finalize plane.so orange design spec v2` | spec |
| 1. Tokens (§5.1, §5.2) | `feat(design): replace Horizonte palette with plane.so neutrals and orange primary` | `src/index.css`, `tailwind.config.ts` |
| 2. Logo, favicon, pré-paint (§5.4, §5.5, §5.8) + teste | `feat(design): recolor logo, favicon and pre-paint for orange primary` | `OriensLogo.tsx`, `public/favicon.svg`, `index.html`, `__tests__/oriens-logo.test.tsx` |
| 3. Páginas públicas e `DayLine` (§5.6, §5.7) + teste | `feat(design): move public pages and day line to primary tokens` | `pages/{Landing,SignLogin,NotFound,TermsOfService}Page.tsx`, `DayLine.tsx`, `__tests__/day-line-marker.test.tsx` |
| 4. Documentação (§5.9) | `docs(design): point palette and logo references to plane.so orange spec` | `docs/conventions/frontend.md`, `docs/specs/oriens-frontend-refactor.md` |

Todos os valores de §5.1 foram aplicados como escritos. `button.tsx` e `src/components/ui/` não foram alterados.

## 2. Verificação automática

Executado em `apps/client/`.

```
$ grep -rnE "brand-(cream|burgundy|yellow)|background-brand" src tailwind.config.ts
(sem saída, exit 1)
```
`rg` não está instalado nesta máquina; o `grep -E` acima é o equivalente exato do comando da spec.

```
$ npm run lint            # eslint .
✖ 14 problems (0 errors, 14 warnings)   exit 0
```
Os 14 avisos são pré-existentes (`react-refresh/only-export-components` em `components/ui/*`,
`react-hooks/exhaustive-deps` em contextos e páginas) e nenhum está em arquivo tocado por este PR.

```
$ npm test                # vitest run
Test Files  39 passed (39)
     Tests  213 passed (213)
```

```
$ npm run build           # vite build
✓ built in 2.79s          exit 0
```
O aviso de chunk > 500 kB já existia. O CSS gerado contém `--primary: 21 92% 38%` e
`--primary: 24 95% 55%` e nenhuma ocorrência de `brand-*`/`background-brand`.

### Testes novos (vermelho → verde)

| Teste | Com o código antigo | Com o novo |
|---|---|---|
| `oriens-logo.test.tsx` (classes `fill-primary`/`fill-foreground`; com `title`: `role="img"` + `<title>`; sem `title`: `aria-hidden`) | 1 falha (`fill-primary` ausente), 2 passam | 3 passam |
| `day-line-marker.test.tsx` (marcador por status: andamento `bg-primary`, concluída `bg-muted-foreground`, pendente `bg-foreground/40`) | 2 falhas (andamento e concluída) | 3 passam |

## 3. Contraste medido no navegador (§6)

Calculado com WCAG 2.x a partir das variáveis CSS computadas na página (cores arredondadas para 8 bits,
por isso diferenças de até 0,04 em relação à spec).

| Par | Claro (spec → medido) | Escuro (spec → medido) |
|---|---|---|
| `foreground` / `background` | 17,11 → 17,12 | 15,32 → 15,30 |
| `foreground` / `card` | 19,18 → 19,16 | 14,71 → 14,70 |
| `primary-foreground` / `primary` | 5,29 → 5,29 | 7,01 → 6,97 |
| `primary` / `background` | 4,71 → 4,73 | 7,01 → 6,97 |
| `primary` / `card` | 5,29 → 5,29 | 6,73 → 6,70 |
| `card` / `chart-1` | 5,29 → 5,29 | 6,73 → 6,70 |
| `muted-foreground` / `background` | 7,61 → 7,63 | 9,08 → 9,07 |
| `muted-foreground` / `muted` | 7,13 → 7,15 | 7,36 → 7,38 |
| `foreground` / `muted` | 16,01 → 16,05 | 12,42 → 12,45 |
| `now` / `background` | 4,82 → 4,84 | 11,99 → 11,96 |
| `input` / `card` | 1,61 → 1,60 | 1,99 → 2,00 |
| `primary` / `now` | 1,02 → 1,02 | 1,71 → 1,72 |

## 4. Revisão visual

Ambiente: `npm run dev` (Vite em `localhost:5173`) com a API local do `ops/compose/docker-compose.dev.yml`.
As portas 8080 e 5432 estavam ocupadas por outro projeto, então o compose subiu com um override
temporário (fora do repositório) que remapeou para `127.0.0.1:18080` e `127.0.0.1:15432`, e o front
rodou com `VITE_API_BASE_URL=http://127.0.0.1:18080`. Os dados vieram de uma conta de teste
`@oriens.test` no banco local descartável (tarefas de hoje nos três status, semana, projeto com quatro
tarefas datadas, três hábitos e cinco lançamentos). Tema alternado pela classe `.dark` no `<html>`.

| Tela | Claro | Escuro | Observação |
|---|---|---|---|
| Landing (topo, faixa `#features-detail`, rodapé) | ✅ | ✅ | Faixa no primário com texto sem opacidade; badge "Em breve" `secondary` legível nos dois temas |
| Login | ✅ | ✅ | Logo com sol laranja e horizonte na cor do texto; botão primário laranja |
| 404 | ✅ | ✅ | — |
| Dashboard, `DayLine` | ✅ | ✅ | Andamento laranja, concluída cinza forte, pendente cinza fraco; linha "agora" em `--now` distinta pela forma (traço de altura total) |
| Dashboard, `WeekView` | ✅ | ✅ | Coluna de hoje e checkboxes por glifo (✓, –, vazio), não só por cor |
| Projeto, kanban | ✅ | ✅ | — |
| Projeto, linha do tempo | ✅ | ✅ | Barra "em andamento" laranja, concluída neutra, marco em losango |
| Estatísticas (atividade e hábitos) | ✅ | ✅ | Calendário em `chart-1`; hábito feito = preenchido + ✓, pendente = contorno |
| Financeiro (resumo e gráficos) | ✅ | ✅ | Gráficos usam cores das tags (dados, inalteradas) |
| Favicon | — | — | `xmllint` válido; servido como `image/svg+xml`. A troca por `prefers-color-scheme` não foi conferida no navegador |

### Pares que só se distinguem por cor (§10)

Nenhum par novo. Pontos observados:

- **Linha "hoje" × barra laranja na linha do tempo (claro, 1,02:1).** A linha passa por baixo da barra e
  some no cruzamento, mas continua visível acima e abaixo, e o rótulo "Hoje" fica no cabeçalho. Forma e
  posição resolvem, como a §6 previa.
- **Tag financeira "Gastos Fixos" (`#FB923C`)** é laranja, próxima do primário. É cor de dado
  (fora de escopo, §7) e vem sempre com rótulo na legenda.

## 5. Problemas e desvios

- **`ResetPasswordPage.tsx` não existe.** A spec (§5.6, §8) lista o arquivo, mas ele foi removido no PR #16
  (remoção do SMTP), antes desta entrega. Não havia nada a trocar; as outras quatro páginas foram migradas.
- **Screenshot da landing (`public/oriens-tasks-screen.png`) ainda mostra a paleta antiga** (bordô/creme).
  É imagem estática e não está no escopo da spec; fica como dívida para atualizar a captura.
- **Badges de prioridade e "Em andamento"** usam tons quentes (bege/âmbar) que contrastam com os neutros
  frios, como a §10 previa para `label-*`. Ficaram como estão (fora de escopo, §7).
- `docker-compose.dev.yml` publica 5432 e 8080 fixos, o que conflita com outros projetos na mesma máquina.
  Não foi alterado.

## 6. O que não foi feito

- Merge e deploy (aguardam pedido do usuário).
- Suíte e2e (Playwright), que não é exigida pela spec.
