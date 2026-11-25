# Documentação do Oriens

O [AGENTS.md](../AGENTS.md) define as regras transversais e o fluxo de contribuição.
Use os guias da tarefa para localizar a regra canônica.

| Tarefa | Guias vigentes |
|---|---|
| Trabalhar com agentes de IA | [Skills do Oriens](guides/agent-skills.md) |
| Instalar ou testar | [Setup e verificação](guides/setup.md) |
| Mudar API | [Estrutura e datas](conventions/backend/structure.md), [autorização](conventions/backend/security.md), [contratos HTTP](conventions/backend/http.md), [testes](conventions/backend/tests.md) |
| Mudar consultas, concorrência ou schema | [Persistência e migrações](conventions/backend/persistence.md), [inventário, backup e restore](guides/database-operations.md) |
| Mudar UI | [Estrutura](conventions/frontend/structure.md), [shadcn](conventions/frontend/components.md), [tokens](conventions/frontend/design-tokens.md), [dados e formulários](conventions/frontend/data.md), [acessibilidade e testes](conventions/frontend/tests.md), [regressão visual](guides/visual-regression.md), [marca](brand/GUIA-DE-USO.md) |
| Mudar MCP/OAuth | [Contratos e segurança](conventions/backend/mcp.md), [operação](guides/mcp-operations.md), [uso nos clientes de IA](mcp.md) |
| Mudar deploy ou CI | [Deploy](guides/deploy.md), [checks de segurança](ci-security.md) |
| Revisar um PR | [Fluxo de revisão](guides/pull-request-review.md) |
| Revisar qualquer mudança | [Clean code](conventions/clean-code.md), [dívida conhecida](conventions/debt.md) |

O [contrato de Projetos v2](contracts/projects-v2.md) documenta a interface HTTP
do domínio de projetos e tarefas. Os guias apontam para specs quando uma decisão
da entrega segue em vigor.

## Registros de entregas

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
todo PR para `dev` ou `main`, inclusive PR só de documentação, e no workflow
reutilizado pelo deploy.
