# Segredos e logs

## Segredos

- Use variáveis de ambiente provisionadas pelo workflow ou pelo operador.
  Registre nomes e placeholders em `.env.example`. O deploy usa os segredos
  do ambiente `production` e o script gera a configuração remota com `umask 077`.
  [Variáveis](../../.env.example) · [Workflow](../../.github/workflows/deploy.yml) ·
  [Script de deploy](../../scripts/deploy.sh)
- A API exige `JWT_SECRET` com pelo menos 64 bytes. A rotação invalida os JWTs
  e os links de anexos assinados com o segredo anterior. `JwtConfigurationTest`
  cobre a falha de inicialização para chave ausente, em branco ou curta, e a
  rejeição de JWT da chave anterior. Para a chave do MCP, siga o procedimento de
  rotação da integração.
  [Configuração JWT](../../apps/api/src/main/java/com/oriens/oriens_api/security/JwtConfiguration.java) ·
  [Assinatura dos anexos](../../apps/api/src/main/java/com/oriens/oriens_api/service/TaskAttachmentService.java) ·
  [Teste JWT](../../apps/api/src/test/java/com/oriens/oriens_api/security/JwtConfigurationTest.java) ·
  [Rotação da chave MCP](mcp-operations.md#rotação-da-chave-de-proteção)
- Se um segredo real for exposto, reporte pelo canal privado, revogue ou
  rotacione o valor e remova a ocorrência do código. O CI verifica o histórico
  alcançável com Gitleaks, com valores ocultos no resultado.
  [Canal privado](../../SECURITY.md#reporte-privado) ·
  [Política de segredos no CI](../ci-security.md#relatórios-cache-e-credenciais)

## Logs e auditoria

- Registre códigos, contagens e IDs de correlação. Mantenha senhas, tokens,
  cookies, cabeçalhos de autorização, corpos e URLs assinadas fora dos logs.
  `WorkExceptionHandler` usa `requestId` e código no erro 5xx. A configuração
  da API desliga a categoria de logs do SDK MCP. Os eventos de auditoria da
  integração têm contrato próprio.
  [Handler](../../apps/api/src/main/java/com/oriens/oriens_api/controller/WorkExceptionHandler.java) ·
  [Configuração da API](../../apps/api/src/main/resources/application.properties) ·
  [Auditoria MCP](../conventions/backend/mcp.md#ferramenta-e-segurança)
- No vhost versionado, o log de acesso usa `$uri`, sem query string ou
  `Referer`. As rotas sensíveis descritas no guia do Nginx descartam o log de
  erro da requisição. Valide no ambiente de destino a configuração do Nginx e
  de outros coletores. A prova isolada verifica que marcadores sintéticos das
  queries OAuth e dos links assinados ficam fora dos logs do proxy.
  [Vhost](../../ops/nginx/oriens.conf) · [Guia do Nginx](../../ops/nginx/README.md) ·
  [Prova isolada](../../scripts/tests/prove_nginx.py)
