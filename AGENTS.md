# AGENTS.md — Oriens

Oriens reúne tarefas, projetos, hábitos, estatísticas e finanças, com integração MCP.
Comece pelo [índice da documentação](docs/README.md) e leia as
[convenções transversais](docs/conventions/clean-code.md) e os guias da sua mudança.
Consulte as [skills do Oriens](docs/guides/agent-skills.md) para o fluxo da tarefa.

| Mudança | Leitura obrigatória |
|---|---|
| API em `apps/api/` | [Estrutura e datas](docs/conventions/backend/structure.md), [autorização e segurança](docs/conventions/backend/security.md), [contratos HTTP](docs/conventions/backend/http.md) e [testes da API](docs/conventions/backend/tests.md). |
| Consultas, concorrência ou schema | [Persistência e migrações](docs/conventions/backend/persistence.md) e [backup e restore](docs/guides/database-operations.md) quando a mudança envolver operação. |
| UI em `apps/client/` | [Estrutura do cliente](docs/conventions/frontend/structure.md), [shadcn](docs/conventions/frontend/components.md), [tokens](docs/conventions/frontend/design-tokens.md), [dados e formulários](docs/conventions/frontend/data.md) e [acessibilidade e testes](docs/conventions/frontend/tests.md). |
| MCP/OAuth | [Contratos e segurança MCP](docs/conventions/backend/mcp.md), [operação MCP](docs/guides/mcp-operations.md) e guias da API/UI afetada. |
| Deploy ou CI | [Deploy](docs/guides/deploy.md), [checks de segurança](docs/ci-security.md) e [setup e testes](docs/guides/setup.md). |
| Documentação | [Escopo e comandos de validação](docs/README.md#validação). Atualize o guia afetado no PR que muda o comportamento. |

## Regras transversais

- **Posse em toda leitura e escrita.** Resolva o dono com `WorkOwner` e filtre na
  consulta. Valide também IDs de vínculos. Recurso alheio responde **404**.
- **Sem N+1.** Carregue vínculos em lote. A API devolve DTOs ou records.
- **Concorrência e banco.** Use versão ou lock conforme o domínio. Hibernate em
  `ddl-auto=validate`. Crie migração Flyway aditiva e preserve migrações aplicadas.
- **Segredos fora do Git.** Documente variáveis em `.env.example`.
- **UI com shadcn e tokens.** Use os componentes existentes e tokens semânticos.
  Trate carregamento, vazio e erro e confira teclado, rótulos e ARIA.
- **Escopo mínimo.** Leia o código e estenda o padrão existente. Evite abstrações
  especulativas. Consulte a [dívida conhecida](docs/conventions/debt.md).
- Peça aprovação antes de decisões difíceis de reverter sobre schema, contrato
  público, auth, remoção de dados, novas dependências ou identidade visual.
- Funcionalidade nova de grande porte segue spec datada em `docs/plans/`,
  aprovação, implementação e evidência.

## Critérios de pronto

- Use `security-review` e `code-review` em todo PR conforme o
  [fluxo de revisão](docs/guides/pull-request-review.md).
- Mudança de comportamento tem teste. Correção tem teste que falhava antes.
  Cubra 404 entre usuários, consultas em lote e concorrência quando afetados.
- Rode a [verificação mínima suficiente](docs/guides/setup.md) e reporte os
  comandos, resultados e lacunas no PR.
- Livre de código morto, logs de depuração, TODO sem dono e código comentado.
- Código, identificadores e Conventional Commits em inglês. UI, mensagens ao
  usuário e documentação em pt-BR.
