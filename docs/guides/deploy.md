# Deploy do Oriens

O [workflow Deploy](../../.github/workflows/deploy.yml) executa em pushes para
`main` que passam pelo filtro de caminhos ou por disparo manual. Ele serializa
a publicação no ambiente `production` e aguarda todos os
[checks](../../.github/workflows/checks.yml).

## Destinos

- A API usa a imagem local `oriens-api` com tag do commit. O
  [Compose de produção](../../ops/compose/docker-compose-prod.yml) sobe
  `oriens-api:latest` em `~/projects/oriens` no VPS, com uploads persistentes em
  `/opt/oriens-uploads` e a rede compartilhada `observability`.
- O cliente estático é publicado em `/var/www/oriens`. O Nginx do VPS serve esse
  diretório e encaminha a API e as rotas MCP/OAuth. A configuração do Nginx é
  administrada no VPS.

## Fluxo

O workflow compila o cliente e a imagem da API, abre a conexão SSH com
verificação de chave do host e envia a imagem, o Compose e o `.env`. A API
anterior fica em `oriens-api:previous`. O deploy espera a porta HTTP responder
antes de publicar a SPA. Se a sondagem expirar, o workflow restaura a tag
anterior quando disponível e retorna erro.

Para mudar opções MCP no ambiente, consulte o
[guia de configuração e operação](mcp-operations.md).
