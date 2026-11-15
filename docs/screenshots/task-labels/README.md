# Prova — etiquetas de tarefas

`browser/` contém seleção múltipla, criação, edição, confirmação de exclusão e
quadro em 1440/768/390/360px, claro e escuro. `long-name-360.png` verifica o limite
de 50 caracteres sem espaços. `browser/results.json` registra as asserções.
`inspect/` contém relatórios, logs e screenshots do seletor e editor, ambos os
temas, nas três larguras do inspector. Os dados são exclusivamente sintéticos.

## Reprodução local

```sh
cd oriens-front
npm run build
cd ..
node docs/screenshots/projects-refactor/p5/fixture-server.mjs oriens-front/dist 4201
```

Em outro terminal, a partir da raiz:

```sh
node docs/screenshots/task-labels/check-browser.mjs
node docs/screenshots/task-labels/inspect-all.mjs
python3 oriens-api/ops/projects-refactor/test_p2.py --labels-browser --browser
```

Os scripts usam Brave instalado em `/Applications/Brave Browser.app` e Playwright
do frontend. `inspect-all.mjs` usa a skill local `design-taste-frontend` indicada
no próprio script. Ajustar esses caminhos em outra estação.

O último comando usa PostgreSQL descartável e API real, JWT e JPA, sem mock de
endpoints de trabalho. `live-browser.mjs` prova criação, associação a tarefa de
projeto e avulsa, leitura em agenda/quadro, renomeação global e exclusão mantendo
as tarefas. `--browser` também executa os fluxos anteriores P5/P6. Nenhum script
aplica migração a banco real ou publica o sistema.
