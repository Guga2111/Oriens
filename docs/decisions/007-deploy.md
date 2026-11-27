# ADR 007 · Topologia do deploy

## Contexto

O Oriens publica uma SPA estática, uma API Spring com arquivos persistentes e
rotas públicas HTTP e MCP/OAuth. O banco de produção é externo ao Compose.

## Decisão vigente

O [workflow de deploy](../../.github/workflows/deploy.yml) faz build no runner e
publica via SSH no VPS depois dos checks. O Nginx serve a SPA e encaminha API e
MCP/OAuth. O [vhost](../../ops/nginx/oriens.conf) é versionado no repositório e o
CD só o instala com `ORIENS_NGINX_APPLY=true`; o padrão deixa o proxy com o
operador. A API sobe pelo [Compose de produção](../../ops/compose/docker-compose-prod.yml),
usa banco configurado por `DB_URL` e compartilha a rede de observabilidade da VPS.

## Alternativas

Hospedar SPA e API como um único artefato amarraria os rollbacks e o serviço HTTP
estático ao processo Java. Usar um registry como origem exigiria configurar
outra etapa de publicação e credenciais na VPS.

## Consequências

O script guarda a imagem anterior e publica a SPA após a sondagem da API.
Com a opção ativa, falha no instalador interrompe a publicação antes de trocar
a API. Operação do proxy, volumes persistentes e compatibilidade de migrações continuam
relevantes para a recuperação. Consulte o [guia de deploy](../guides/deploy.md),
[Nginx](../../ops/nginx/README.md) e a [operação MCP](../guides/mcp-operations.md).
