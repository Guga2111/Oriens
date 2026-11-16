# Frame único das páginas

Correção de 16/11/2026. As páginas tinham o mesmo padding, mas limites de largura diferentes: 720px, 1280px e 1600px. Em uma janela de 1920px com sidebar aberta, Todos os dados deixava 352px à direita, contra 32px nas Estatísticas. A verificação anterior comparava padding CSS, sem detectar o limite interno dos painéis.

`AppLayout` é o único responsável pelo espaçamento externo das rotas autenticadas: `px-page`, com 16px abaixo de 768px, 32px de 768 a 1023px e 64px a partir de 1024px. O padding vertical permanece em 16/32px. Dialogs, sheets e drawers usam o token independente `overlay`, mantendo 16/32px sem herdar os 64px das páginas. As páginas usam a largura disponível e não definem padding externo ou max-width próprios. Foram removidos os seletores de descendentes e os tokens de largura de tela que ficaram sem uso. Cards, textos, grids e modais mantêm suas regras internas.

| Janela / sidebar aberta | Todos os dados: esquerda / direita | Estatísticas: esquerda / direita | Largura de conteúdo |
|---|---|---|---|
| 1920px | 64px / 64px | 64px / 64px | 1536px |
| 2560px | 64px / 64px | 64px / 64px | 2176px |

[Antes: Todos os dados](before-all-data.png) · [Antes: Estatísticas](before-stats.png)

[Depois: 1920px, dados](1920-expanded-all-data.png) · [1920px, estatísticas](1920-expanded-stats.png) · [2560px, dados](2560-expanded-all-data.png) · [2560px, estatísticas](2560-expanded-stats.png)

[Sidebar recolhida: dados](1920-collapsed-all-data.png) · [estatísticas](1920-collapsed-stats.png) · [Celular: dados](390-mobile-all-data.png) · [estatísticas](390-mobile-stats.png)

[Tela Hoje em 1666px, com 64px medidos dos dois lados](today-1666.png). Uma verificação adicional confirmou que os overlays continuam com 16/32px em 390/768/1666px.

O [teste de regressão no navegador](browser-proof.mjs) passou em **99 combinações**: onze rotas, larguras de 390/768/1024/1440/1920/2560px e sidebar aberta/recolhida no desktop. Verifica as bordas reais do título, do conteúdo e dos painéis, largura do primeiro bloco, ausência de padding duplicado e overflow. Usa a fixture local com dados sintéticos; nenhuma conta real foi alterada. [Medições completas](browser-results.json).

Passaram também os 131 testes do frontend, TypeScript, build de produção e `git diff --check`. ESLint sem erros, mantendo dois avisos preexistentes. Inspector final: [0 FAIL e 2 WARN](../../../.taste-skill/page-frame/report.json). A suíte backend não foi repetida nesta correção de layout.

ROUND 1 — final
Seen in one second: títulos e painéis compartilham as mesmas bordas.
Idea (one sentence): o frame externo pertence ao layout e permanece igual ao trocar de rota.
Live thing: navegação e filtros existentes preservados.
Layout words by section: shell=frame / dados=tabela / estatísticas=painéis.
Scores: design 7.5 · usability 8.5 · creativity 7 · content 8 → overall 7.8.
Caps applied: nenhum FAIL; mantida a direção existente, sem redraw.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Antes, Todos os dados: painel parava 352px antes da direita; removidos os limites de largura próprios das páginas.
2. desktop-fold: alturas naturais diferentes entre planejamento e hábitos; mantidas para evitar preencher o painel menor com vazio.
3. mobile-fold: heatmap anual ocupa grande parte da dobra; preservada a área tátil. O aviso icon-chips corresponde às marcas funcionais de execução.

Todas as capturas finais foram abertas para revisão. O heatmap mantém células de tamanho próprio dentro do painel; o painel e sua legenda usam o frame completo.
