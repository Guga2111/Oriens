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

O workflow chama [scripts/deploy.sh](../../scripts/deploy.sh) em duas fases. As
credenciais da VPS ficam no workflow, que configura o alias SSH `vps` com
verificação da chave do host. As credenciais de banco e MCP são passadas só à
fase de publicação.

| Comando | Entrada e execução |
|---|---|
| `./scripts/deploy.sh build` | `IMAGE_TAG` com o SHA completo do commit. Executa `npm ci` e `npm run build` em `apps/client` e constrói a imagem a partir de `apps/api`. O workflow fornece a chave pública do Google Maps ao cliente. |
| `./scripts/deploy.sh publish` | Mesmo checkout, SHA, distribuição e imagem da fase de build. Usa o alias `vps`, `REMOTE_DIR`, `WEB_ROOT`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `API_PORT` e `ORIENS_MCP_ENABLED`. Com MCP habilitado, também recebe issuer, origem do frontend, senha de criptografia e salt. |

A publicação envia a imagem via `docker save` e SSH, copia o Compose e atualiza
o `.env` remoto. A tag `latest` anterior é salva em `previous` antes de recriar
a API. A sondagem usa até 72 tentativas, com pausa de cinco segundos, e aceita
uma resposta HTTP na porta local. A SPA é publicada depois dessa resposta.

## Falha e rollback

Se a API parar de responder durante a publicação, consulte o log do job e os
logs do serviço `api` no Compose do VPS. Ao esgotar a sondagem, o script registra
os logs, restaura `oriens-api:previous` quando disponível e termina com erro.
A SPA nova só é enviada após a sondagem bem-sucedida. O rollback automático
troca a imagem da API e reutiliza o `.env` e o banco.

Se precisar recuperar a publicação manualmente, confirme o destino, qual
imagem a tag `previous` identifica e a compatibilidade com o schema atual.
Com autorização, restaure a tag e recrie o serviço no VPS. Se a SPA nova já foi
publicada, recoloque a distribuição correspondente à API restaurada. Consulte
o [guia de operação do MCP](mcp-operations.md) para alterações de integração.

## Prova isolada

Os testes executam o shell local e remoto com substitutos para npm, Docker,
SSH, SCP e sondagem. Valide na raiz com os comandos abaixo.

```sh
bash -n scripts/deploy.sh
python3 -B -m unittest discover -s scripts/tests -p 'test_deploy.py' -v
```
