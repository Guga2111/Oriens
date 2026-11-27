# Design system do Oriens

Use os [primitivos shadcn/ui do cliente](components.md) para controles e os
tokens semânticos para aplicar a identidade do Oriens. Consulte o
[catálogo de tokens](design-token-catalog.md) para escolher classes e os
[exemplos de composição](design-system-examples.md) para conferir telas reais.

O [ADR 005](../../decisions/005-cliente.md) registra a escolha dos primitivos
locais com Radix e tokens próprios. A [decisão de paleta](../../plans/2026-11-22-design-system-plane-so-orange-design.md#51-tokens-semânticos-srcindexcss)
registra a origem dos neutros e da ação laranja. O [guia da marca](../../brand/GUIA-DE-USO.md)
orienta o uso do logo e dos assets. Mudanças de identidade visual exigem aprovação.

## Cores: só tokens semânticos

Escolha o par conforme o papel da superfície. Em um cartão, use
`bg-card text-card-foreground`. Para texto de apoio, use
`text-muted-foreground`. Para uma ação primária, use a variante padrão de
`Button`. Aplique `border-input` em campos e `border-border` em divisores.
O foco usa `ring-ring`.

O [CSS global](../../../apps/client/src/index.css) define o tema claro em
`:root` e as substituições em `.dark`. A [configuração Tailwind](../../../apps/client/tailwind.config.ts)
mapeia os tokens para utilitários. No claro, cartões brancos se destacam sobre
o fundo cinza, e a ação laranja tem texto branco. No escuro, as superfícies
são cinza-escuras e a ação laranja mais clara tem texto escuro.

O [HTML de entrada](../../../apps/client/index.html) aplica a classe em
`<html>` antes da primeira pintura, dando precedência à preferência em cache.
Após a autenticação, o [contexto de preferências](../../../apps/client/src/context/SettingsContext.tsx)
aplica o tema da conta. Confira a classe efetiva no navegador ao testar.

Use o mesmo utilitário de cor nos dois temas. Mantenha cores literais e
valores da paleta Tailwind fora dos estilos da UI. Resolva as cores de tema
pelos tokens e use `text-muted-foreground` para texto secundário.
Se um papel visual realmente pedir um token
novo, defina-o em ambos os temas, mapeie-o no Tailwind e confira o contraste
do par nos estados em que ele aparece. Preserve rótulos e outros sinais
além da cor para comunicar status, erros e prioridades.

As etiquetas de tarefas usam a paleta fechada `label-*`. Cores livres de
tags financeiras e projetos vêm dos dados. Passe esses valores por uma
variável CSS em runtime, como em [ProjectCard](../../../apps/client/src/components/projects/ProjectCard.tsx).
Use uma constante em `lib/` para o valor padrão, como
[`DEFAULT_TAG_COLOR`](../../../apps/client/src/lib/financial-tags.ts).

O [ESLint](../../../apps/client/eslint.config.js) bloqueia as classes de
paleta crua e de cor arbitrária cobertas pela regra, além de controles
HTML com equivalente shadcn. Primitivos em `components/ui` e testes ficam
fora dessa regra. Revise também cores fora de classes e usos de `a` e `img`
conforme o [guia de componentes](components.md).

## Espaço, tipografia, raio e sombras

Comece pela escala Tailwind para espaçar conteúdo e dimensionar controles,
como `gap-3`, `p-4` e `size-8`. Para a geometria compartilhada, use classes
do [catálogo](design-token-catalog.md#geometria), como `px-page` nas páginas,
`p-overlay` em sobreposições e `w-board-column` nas colunas do quadro.

Use Inter por meio da família sans do cliente. Prefira `text-page-title`
para o título de página, `text-sm` para controles compactos,
`text-2xs` para metadados compactos e `tabular-nums` para alinhar números.
Deixe o primitivo definir a escala tipográfica, o raio e a elevação dos
controles. O cartão usa `shadow-sm`, o popover usa `shadow-md` e o painel
lateral pode usar `shadow-sheet`, cuja opacidade varia por tema.

Prefira classes da escala e tokens para medidas recorrentes. Use
seletores como `data-[state=open]` para estados de primitivos. Adote medidas
arbitrárias apenas para casos pontuais justificados, como um cálculo único
com variáveis existentes. Reserve `style` para dados de runtime, como a
posição de um marcador ou a largura percentual de uma barra.

## Ícones e movimento

Use `lucide-react` para ícones de interface, com o tamanho do primitivo
ou uma classe como `size-4`. O
[trilho de contextos](../../../apps/client/src/components/layout/AppContextRail.tsx)
usa Phosphor com `weight="fill"`. Os imports individuais de
[`app-contexts.ts`](../../../apps/client/src/components/layout/app-contexts.ts)
evitam carregar o catálogo inteiro em desenvolvimento. Dê nome acessível
ao controle que só tem ícone e marque como decorativo o ícone que acompanha
um rótulo equivalente. Para a marca, use
[`OriensLogo`](../../../apps/client/src/components/common/OriensLogo.tsx).

Reaproveite as animações de abertura e fechamento controladas pelo
`data-state` dos primitivos. O acordeão usa `animate-accordion-down` e
`animate-accordion-up` com 200 ms. O diálogo usa `duration-200` e o
`Button` define transições de 120 ms. O CSS global desativa animações,
transições e rolagem suave com `prefers-reduced-motion: reduce`.
Preserve o feedback de estado quando a animação estiver desativada.

## Composição e validação

Parta de `components/ui` e reutilize composições como `ResponsiveDialog`,
`WorkCombobox` e `WorkFeedback` em `components/common`. Use as variantes
CVA do primitivo e combine classes com `cn()` quando precisar ajustar o
layout. Com `asChild`, o primitivo aplica seu estilo e comportamento ao
filho, como um `Link` ou um `Button` que abre um popover.

Confira contraste, rótulos, foco visível, teclado e estados em claro e
escuro nos viewports relevantes. Os comandos e as baselines estão no
[guia de regressão visual](../../guides/visual-regression.md). Use os
[critérios de acessibilidade e testes](tests.md) e consulte as
[skills de UI e Playwright](../../guides/agent-skills.md#quando-usar)
para o fluxo de revisão.
