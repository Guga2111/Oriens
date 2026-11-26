# ADR 004 · OAuth delegado para MCP

## Contexto

Clientes de IA precisam operar na conta do usuário com permissões menores que
as da sessão do aplicativo e com revogação independente.

## Decisão vigente

O servidor OAuth em
[`McpSecurity`](../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpSecurity.java)
usa Authorization Code com PKCE. Uma conexão delegada limita a atuação por
escopos, projetos autorizados e permissão explícita para tarefas avulsas.
O backend aplica a política vigente em cada chamada e impõe a posse no domínio.

## Alternativas

Reutilizar o JWT da SPA acoplaria a sessão do app ao cliente de IA. Chaves
estáticas por conta dificultariam consentimento, expiração e recorte por conexão.

## Consequências

O fluxo exige cadastro do cliente, consentimento e gestão do ciclo de tokens.
Há armazenamento e migrações próprios, e o MCP depende da configuração explícita
de ambientes. Consulte a [spec da conta MCP](../plans/2026-11-16-mcp-account-spec.md),
o [contrato](../conventions/backend/mcp.md) e a [operação](../guides/mcp-operations.md).
