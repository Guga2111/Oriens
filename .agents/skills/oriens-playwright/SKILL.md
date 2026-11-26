---
name: oriens-playwright
description: Inspecione UI do Oriens no navegador com playwright-cli e confira a regressão visual do Playwright ao alterar tela, estado ou interação.
---

# Revisão de UI com Playwright

Leia os [testes do frontend](../../../docs/conventions/frontend/tests.md), os
[tokens](../../../docs/conventions/frontend/design-tokens.md) e o
[guia visual](../../../docs/guides/visual-regression.md).

1. Inicie cliente e API local se o fluxo exigir autenticação. Use conta e dados
   sintéticos. Capture o estado inicial antes de editar a UI.
2. Crie `output/playwright/<tarefa>/` na raiz e execute o CLI nessa pasta.
   Use uma sessão própria, leia as imagens e repita em 1440×900 e 390×844,
   nos temas claro e escuro. Exemplo para captura da landing:

   ```sh
   playwright-cli -s=oriens-ui open --browser=chromium http://127.0.0.1:5173/
   playwright-cli -s=oriens-ui resize 390 844
   playwright-cli -s=oriens-ui set-color-scheme dark
   playwright-cli -s=oriens-ui localstorage-set oriens-theme dark
   playwright-cli -s=oriens-ui reload
   playwright-cli -s=oriens-ui snapshot
   playwright-cli -s=oriens-ui screenshot --filename=landing-390-dark.png
   playwright-cli -s=oriens-ui console error
   ```

   Nas páginas públicas, defina `oriens-theme` com `localstorage-set` e recarregue.
   No produto autenticado, use a preferência de aparência do Oriens. Confirme
   a classe de tema renderizada. Use `snapshot`, `press Tab` e `press Escape`
   para verificar nomes, foco e sobreposições. Confira largura, estados e erros
   de execução. Encerre com `playwright-cli -s=oriens-ui close`.
3. Rode a suíte visual no ambiente do CI para superfícies cobertas. Confira
   esperado, obtido e diff. Siga o guia para atualizar as baselines fruto de
   mudanças intencionais. Se o CLI estiver ausente, use o navegador disponível
   e registre a ferramenta utilizada.

Entregue URL, estado, viewport, tema, capturas, resultado da comparação e
lacunas observadas. Publique apenas capturas sanitizadas.
