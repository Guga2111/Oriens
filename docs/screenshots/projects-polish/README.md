# Projetos e agenda — revisão visual de 2026-11-15

Mantida a direção Horizonte e o design system existente. As decisões, crítica
antes/depois, prova e limites estão no
[registro da revisão](../../plans/2026-11-15-projects-visual-polish.md).

- `before/`: formulário anterior, inspecionado no build original.
- `round1/`: primeira iteração do editor.
- `final/`: inspector em 1440/768/390, incluindo relatórios JSON e capturas de página.
- `browser/`: interações e capturas em claro/escuro e 360/390/768/1024/1440.
  `results.json` registra a matriz e o arraste; a capa identificada como Capa de QA
  é apenas uma imagem sintética para provar o recorte responsivo.

Reprodução a partir da raiz do repositório:

```sh
npm --prefix oriens-front run build
node docs/screenshots/projects-refactor/p5/fixture-server.mjs apps/client/dist 4198
```

Em outro terminal:

```sh
node docs/screenshots/projects-polish/check-browser.mjs
node docs/screenshots/projects-polish/inspect-all.mjs
```

Os scripts usam o Brave instalado em `/Applications/Brave Browser.app` e os
fixtures em memória existentes. Não usar estes fixtures como backend do produto.
O inspector depende da instalação local da skill design-taste-frontend; seu
caminho está explícito no script, conforme as evidências anteriores do repositório.
