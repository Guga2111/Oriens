# Plano de design — migrar design system do Oriens para plane.so com primário laranja

**Data:** 2026-11-22  
**Autor:** agente de código (OpenCode)  
**Status:** aprovado para documentação (não implementado)  
**Branch:** `dev`  
**Ramo relacionado:** `docs/plans`

## 1. Contexto

O usuário solicitou migrar o design system da aplicação `oriens-front` para replicar o utilizado no [plane.so](https://app.plane.so/gugones/projects/d34dc3a0-5516-451c-aaca-dbf0f334b4c5/issues/), com as seguintes mudanças específicas:

1. Substituir a cor azul elétrica (primária do plane.so) por **laranja** no botão primário e no design system.
2. Modificar o **SVG do logo do Oriens**.
3. Modificar o **favicon**.

O design system atual do Oriens está especificado em `docs/specs/oriens-frontend-refactor.md` (direção "Horizonte", aprovada v1.1, 2026-11-11), com:

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--primary` | `var(--brand-burgundy)` (#731328) | `var(--brand-cream)` (#FDEFD6) | Ação principal, item ativo |
| `--background` (app) | `38 40% 95%` (#F7F4ED) | `350 18% 12%` (#24191B) | Canvas do app |
| `--background-brand` | `var(--brand-cream)` (#FDEFD6) | `350 18% 12%` | Páginas públicas |
| `--ring` | `var(--brand-burgundy)` | `var(--brand-yellow)` | Foco |

Arquivos envolvidos hoje:
- `src/components/ui/button.tsx` — variant `default` = `bg-primary text-primary-foreground`.
- `src/components/common/OriensLogo.tsx` — meio-sol: sol `fill-brand-yellow`, horizonte `fill-brand-burgundy`.
- `public/favicon.svg` — mesmo desenho, com **hex literais** `#F3B90B` e `#731328` (fora de token).
- `index.html` — pré-paint espelha tokens claro/escuro.

## 2. Bloqueios identificados

| Item | Status |
|---|---|
| Criar task no objetivo do Oriens via MCP | **Bloqueado** — o `.mcp.json` está vazio e o ambiente exige registro OAuth próprio (clientId) que não está disponível. Não reutilizar identificador de outro app. |
| Inspecionar componentes do plane.so | **Bloqueado** — o link está atrás de autenticação; não há navegador logado disponível ao agente. Trabalhar com suposições documentadas (plane.so: design limpo, minimalista, sidebar, primário azul elétrico). |
| Mudança de identidade visual | **Aprovada pelo usuário** (opção 3A) — sobrepõe a spec "Horizonte" (bordô/cream). |

## 3. Abordagens consideradas (trade-offs)

| # | Abordagem | Trade-offs |
|---|-----------|------------|
| **A** | Substituir totalmente "Horizonte" por plane.so minimalista + laranja; novo SVG e favicon laranja. | Máxima fidelidade ao plane.so, mas reescreve tokens/shell/rótulos; escopo grande, risco de quebrar telas já entregues. |
| **B** | Manter "Horizonte"; trocar apenas primário bordô→laranja e atualizar SVG/favicon. | Escopo mínimo, baixo risco, mas não "replica o design system do plane.so" (fica só a cor). |
| **C** (recomendada) | Híbrido: adotar a arquitetura visual do plane.so (sidebar limpa, componentes planos, densidade) com **laranja como primário**, mantendo tokens do Oriens onde não conflitam; novo SVG/favicon laranja. | Equilíbrio: replica o visual do plane.so com a cor pedida, sem reescrever o shell inteiro. Escopo mínimo coerente (AGENTS.md #9). |

**Recomendação: C.**

## 4. Design aprovado (seções)

### 4.1 Tokens de cor (src/index.css + tailwind.config.ts)

Token novo `--primary` = **laranja** (em HSL, formato do projeto `H S% L%`), em `:root` e `.dark`.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--primary` | laranja (~`25 90% 50%`) | laranja (~`25 90% 50%` ou tom mais claro) | Botão primário, item ativo, anel de foco |
| `--primary-foreground` | branco | branco/laranja escuro | Texto sobre primário |
| `--ring` | laranja | laranja | `focus-visible` |
| `--chart-1` | laranja | laranja | Série principal de gráficos |
| `--brand-*` | mantidos | mantidos | Páginas públicas (não primário do app) |

Regras do frontend.md §3.1: nada de hex/rgb/hsl literal, nada de paleta crua do Tailwind, cor só por token semântico. A mudança de identidade visual requer aprovação (já obtida, opção 3A).

### 4.2 Botão primário (src/components/ui/button.tsx)

Nenhuma mudança de código no componente shadcn necessária: o variant `default` já consome `bg-primary text-primary-foreground`. Trocar o token `--primary` de bordô para laranja é suficiente. Não criar variantes novas nem classes soltas (frontend.md §2.3).

### 4.3 Logo SVG (src/components/common/OriensLogo.tsx)

Manter viewBox `0 0 48 48`, estrutura de meio-sol (sol + linhas do horizonte) e acessibilidade (`role="img"`, `aria-label`, `<title>`).

Mudança de cor:
- Sol: de `fill-brand-yellow` → `fill-primary` (laranja).
- Horizonte/linhas: de `fill-brand-burgundy` → tom laranja escuro ou neutro (não bordô). Sugestão: `fill-[hsl(var(--primary))]` com opacidade reduzida, ou token dedicado `--brand-orange` se o usuário preferir separar do primário.

Manter classes Tailwind (`fill-brand-yellow` → `fill-primary`, `fill-brand-burgundy` → `fill-primary` ou novo token). Não usar `style={{…}}` estático nem hex literal.

### 4.4 Favicon (public/favicon.svg)

Mesmo desenho do logo (meio-sol), cores em laranja (sem hex literal). Substituir `#F3B90B` → cor do sol (laranja) e `#731328` → tom do horizonte. Manter `viewBox="0 0 48 48"`, `role="img"`, `aria-label="Oriens"`.

### 4.5 index.html (pré-paint anti-FOUC)

Espelhar o novo fundo claro/escuro no `<style>` de `index.html` (substituir `hsl(38 40% 95%)` / `hsl(350 18% 12%)` pelos novos valores de `--background` claro/escuro, se houver mudança de fundo). Se o fundo não mudar, não tocar.

## 5. Escopo fora (não fazer nesta entrega)

- Não criar task via MCP (bloqueado, item 3).
- Não implementar código (usuário pediu apenas documentação + commit agora).
- Não mudar contrato de API, rotas, regras de negócio.
- Não mudar framework, não migrar Tailwind v4, não trocar Radix por Base UI.
- Não adicionar dependência de runtime nova.
- Não reescrever shell/layout inteiro (escopo mínimo coerente).

## 6. Critérios de aceitação (quando implementado)

- [ ] Botão primário usa laranja via token `--primary`, sem hex literal.
- [ ] Logo SVG usa laranja, sem bordô, acessível (`role="img"`, `aria-label`).
- [ ] Favicon usa laranja, sem hex literal.
- [ ] `npm run lint` passa (regra 7: cores só por token).
- [ ] `npm run build` passa (tipos de import validados).
- [ ] Contraste AA verificado nos dois temas (frontend.md §7).

## 7. Próximos passos (após aprovação desta documentação)

1. Restaurar/reconfigurar o MCP (`oriens` em `.mcp.json`) com registro OAuth próprio e criar a task no objetivo do Oriens.
2. Implementar os tokens (index.css + tailwind.config.ts).
3. Atualizar `OriensLogo.tsx` e `public/favicon.svg`.
4. Ajustar `index.html` pré-paint se necessário.
5. Rodar `npm run lint && npm run build` e commitar a implementação.

---

**Commit:** na branch `dev`, escopo `docs`, assunto: `docs(design): record design system migration to plane.so with orange primary`.
