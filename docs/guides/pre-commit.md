# Pre-commit local

Adote o hook quando quiser verificar o staged antes de gravar um commit. Use os
[pré-requisitos do setup](setup.md), rode `npm ci` em `apps/client` e instale o
[Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), a
versão da [política do CI](../ci-security.md). Confira o checksum da release.
O binário pode estar no `PATH` ou ser indicado por `GITLEAKS_BINARY`.

Use por commit, inclusive em worktree vinculada.

```sh
git -c core.hooksPath=.githooks commit
```

Em um clone independente, você também pode selecionar o hook uma vez com
`git config --local core.hooksPath .githooks`. Confira antes com
`git config --show-origin --get core.hooksPath`. Se já houver um hook,
mantenha a configuração e use o comando por commit quando quiser este fluxo.
Para desfazer uma instalação local feita acima, execute
`git config --local --unset core.hooksPath`. Em worktrees vinculadas, prefira
a opção por commit para preservar a configuração compartilhada.

| Staged | Verificação |
|---|---|
| Qualquer alteração | Gitleaks no diff do índice, com a política do repositório. A saída do scanner é suprimida. |
| Fontes, configuração, manifest npm ou E2E do cliente | `make lint`. Vitest roda testes relacionados às fontes TS/TSX selecionadas ou um teste rápido quando não há fonte selecionada. |
| Fontes, configuração Maven ou wrapper da API | Maven executa complexidade e unidades de JWT, uploads e Markdown, sem PostgreSQL. |

O staged define o escopo. ESLint, Vitest e Maven leem a árvore de trabalho, com
as dependências instaladas. Para conferir o conteúdo exato de um arquivo em
commit parcial, execute os checks em um checkout sem alterações adicionais.

O hook informa quando a varredura encontra um candidato ou a ferramenta falha.
Revise o diff em privado e remova o valor do staged antes da nova tentativa.
Se o valor for real e já estiver exposto, use o
[canal de segurança](../../SECURITY.md) e providencie a rotação. Se lint ou
teste falhar, corrija o erro e atualize o índice. Os
[checks do CI](../../.github/workflows/checks.yml) executam suas próprias suítes
e a varredura de histórico, independentemente da instalação local.
