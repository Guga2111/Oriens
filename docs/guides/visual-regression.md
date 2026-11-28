# Regressão visual da UI

Use o [guia de testes](../conventions/frontend/tests.md) e os
[design system](../conventions/frontend/design-tokens.md) na revisão da entrega #110.
A [skill oriens-playwright](../../.agents/skills/oriens-playwright/SKILL.md)
orienta a inspeção interativa. O teste automatizado compara as baselines
versionadas da landing, do editor de tarefas em Hoje e do quadro de projetos.

## Executar e gerar baselines

Execute na raiz com Docker. A imagem oficial contém o Chromium e as fontes
do sistema. Use Linux amd64 também em máquinas ARM para gerar as mesmas
imagens do runner. A instalação usa o lockfile e fica em um volume temporário.

```sh
docker run --rm --platform linux/amd64 --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  --mount "type=bind,source=$PWD/apps/client,target=/client" \
  --tmpfs /client/node_modules:exec,mode=1777 --workdir /client \
  mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe \
  bash -euc 'npm ci --no-audit --no-fund; npm run test:visual'
```

A suíte visual inclui os [fluxos de entrada e edição](../../apps/client/e2e/visual/surfaces.spec.ts)
e o [quadro de projetos](../../apps/client/e2e/visual/project-board.spec.ts). Ela roda em desktop
1440×900 e mobile 390×844, com tema claro e escuro, DPR 1, locale pt-BR,
relógio fixo e movimento reduzido. As rotas de API usam respostas sintéticas
no browser. As demais origens são bloqueadas, com a fonte Inter servida por
[fixture local](../../apps/client/e2e/visual/fixtures.ts). O arquivo Inter Latin
vem do [Google Fonts](https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcviYwY.woff2)
e tem [licença OFL](../../apps/client/e2e/visual/fixtures/OFL-Inter). A suíte exige
a fonte carregada e usa os assets reais do checkout. A suíte funcional usa a
API de teste conforme o [setup](setup.md#cliente).

## Revisar uma divergência

1. Abra o relatório HTML em `apps/client/playwright-report/` e compare
   `expected`, `actual` e `diff` em `apps/client/test-results/visual/`. No
   GitHub baixe o artefato `playwright-visual` do job `test-visual`.
2. Identifique a causa na camada que mudou. Verifique token, tema, viewport e
   estado comparando com o guia de frontend. Se o desvio for inesperado, corrija
   a origem e execute a suíte novamente.
3. Para uma mudança visual esperada, acrescente
   `-- --update-snapshots=all` à chamada de `npm run test:visual` dentro do
   comando Docker. Use `--grep` ou `--project` depois de `--` para limitar
   o escopo quando fizer sentido. Revise os PNGs alterados nas
   pastas `*-snapshots/` em `apps/client/e2e/visual/` e inclua-os com a mudança.
4. Execute a comparação normal em dois processos independentes. Para aferir o
   detector, altere temporariamente uma classe visual visível em uma cópia
   descartável, execute contra a baseline e confirme que o diff foi produzido.
5. Ao atualizar Playwright, alinhe a imagem no workflow e neste guia à versão
   do lockfile, revise a renderização e volte a validar a estabilidade.

## CI e proteção de branches

O [workflow visual](../../.github/workflows/visual.yml) roda em todo PR para
`dev` e `main`, inclusive documentação. O job publica diffs quando falha. A
#56 deve confirmar o nome exibido, a estabilidade nas execuções remotas e o
bloqueio de merge antes de dar o aceite da proteção. O deploy segue o workflow
reutilizado de checks descrito no [guia de deploy](deploy.md).
