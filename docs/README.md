# Documentação do Oriens

O Oriens reúne a [API](../apps/api/) e o [cliente](../apps/client/) no mesmo
repositório. As rotinas ficam em [`scripts/`](../scripts/) e a configuração de
operação fica em [`ops/`](../ops/). O [ADR do monorepo](decisions/006-monorepo.md)
explica a organização.

## Desenvolvimento local

- [Setup e verificação](guides/setup.md) para preparar o ambiente e executar
  os comandos do Makefile, da API e do cliente.
- [AGENTS.md](../AGENTS.md) para as leituras por tipo de mudança e
  [skills do Oriens](guides/agent-skills.md) para a rotina de agentes.
- [Clean code](conventions/clean-code.md), [dívida conhecida](conventions/debt.md),
  [pre-commit local](guides/pre-commit.md) e [revisão de PR](guides/pull-request-review.md).

## Guias por camada

- [API](conventions/backend.md) com estrutura, contratos HTTP, autorização,
  persistência, migrações e testes. [Dependências da API](conventions/backend/stack.md)
- [Cliente](conventions/frontend.md) com estrutura, componentes, dados,
  acessibilidade e testes. [Dependências do cliente](conventions/frontend/stack.md)
- [Design system](conventions/frontend/design-tokens.md),
  [catálogo de tokens](conventions/frontend/design-token-catalog.md),
  [exemplos de composição](conventions/frontend/design-system-examples.md),
  [regressão visual](guides/visual-regression.md) e [marca](brand/GUIA-DE-USO.md).
- [MCP e OAuth](conventions/backend/mcp.md) para contratos e segurança e
  [acesso MCP em clientes de IA](mcp.md) para configuração da conexão.

O [contrato de Projetos v2](contracts/projects-v2.md) documenta a interface HTTP
do domínio de projetos e tarefas. Os guias apontam para specs quando uma decisão
da entrega segue em vigor.

## Operação e segurança

- [Deploy](guides/deploy.md), [instalação e rollback do Nginx](../ops/nginx/README.md)
  e [checks de segurança do CI](ci-security.md).
- [Inventário, backup e restore](guides/database-operations.md) e
  [operação do MCP](guides/mcp-operations.md).
- [Política de segurança e reporte privado](../SECURITY.md), com os guias de
  [JWT e posse](conventions/backend/security.md), [uploads](guides/security-uploads.md),
  [CORS e limites de taxa](guides/security-browser-and-rate-limits.md) e
  [segredos e logs](guides/security-secrets-and-logs.md).

## Decisões e histórico

- [ADRs](decisions/README.md) registram as decisões de arquitetura vigentes.
- [Planos e evidências datados](plans/) e [specs](specs/) registram decisões e
  verificações por entrega. Confira a data e o estado antes de repetir comandos.
- [Capturas e provas visuais](screenshots/) e [evidências do cliente](client/)
  registram o estado das telas nas entregas correspondentes.
- [Fases do MCP](../ops/mcp-account/README.md) e
  [refatoração de Projetos](../ops/projects-refactor/README.md) registram os
  procedimentos originais e as provas. Use os guias acima na operação atual.

## Validação

O [check de documentação](../scripts/check-docs-links.py) verifica links e
âncoras relativos em Markdown versionado ou novo no repositório. As referências
externas ficam disponíveis para consulta manual.

A meta editorial é **150 linhas** por guia vigente, com **teto de 200**. O check
aplica o teto aos Markdown em `docs/conventions/` e `docs/guides/`, aos índices
de entrada, aos guias de acesso MCP, segurança do CI e marca e aos arquivos em
`.agents/skills/`. Contratos, specs, planos, provas e runbooks históricos
seguem a validação de links e âncoras.

Execute os dois comandos na raiz antes de abrir o PR.

```sh
python3 -B scripts/check-docs-links.py
python3 -B -m unittest discover -s scripts/tests -p 'test_check_docs_links.py' -v
```

O job `docs` do [workflow de checks](../.github/workflows/checks.yml) roda em
todo PR para `dev`, `main` ou `refac/**`, inclusive PR só de documentação, e no workflow
reutilizado pelo deploy.
