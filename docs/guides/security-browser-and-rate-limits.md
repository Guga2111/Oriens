# CORS e limites de taxa

## CORS

`CorsConfig` mantém uma lista explícita de origens, incluindo o Vite em
`http://localhost:5173`. Com MCP habilitado, acrescenta a origem do frontend
configurada para a integração. A política permite credenciais, aceita os
cabeçalhos da requisição e expõe `Authorization`, `ETag` e `X-Request-Id`.
Consulte o código para as origens e os métodos vigentes. CORS controla o
acesso pelo navegador. A API continua validando autenticação e posse.
[Configuração CORS](../../apps/api/src/main/java/com/oriens/oriens_api/CorsConfig.java) ·
[Autenticação e posse](../conventions/backend/security.md)

Ao mudar uma origem, confira o preflight da interface autorizada e a recusa
de uma origem fora da lista. `McpDisabledSecurityTest` cobre ambos os casos
com a integração desligada. A ponte OAuth também valida a origem do frontend
na API e tem teste com navegador real, habilitado por `MCP_BROWSER_PROOF=1`.
[Teste de preflight](../../apps/api/src/test/java/com/oriens/oriens_api/security/McpDisabledSecurityTest.java) ·
[Teste de navegador](../../apps/api/src/test/java/com/oriens/oriens_api/work/McpPostgresTest.java) ·
[Operação da ponte OAuth](mcp-operations.md#configuração)

## Limites de taxa

`McpRateLimiter` mantém contadores no PostgreSQL. O início da autorização OAuth,
o transporte MCP e as ferramentas de domínio têm cotas próprias. Confira os
valores e pontos de aplicação no contrato. O caso `strictManagementAndSharedLimits`
exercita a recusa de nova aquisição após esgotar o orçamento de um contador.
[Contrato MCP](../conventions/backend/mcp.md#ferramenta-e-segurança) ·
[Limitador](../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpRateLimiter.java) ·
[Teste do limitador](../../apps/api/src/test/java/com/oriens/oriens_api/work/McpPostgresTest.java)
