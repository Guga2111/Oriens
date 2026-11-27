# Deploy do Oriens

O [workflow Deploy](../../.github/workflows/deploy.yml) executa em pushes para
`main` que passam pelo filtro de caminhos ou por disparo manual em `main`. Ele serializa
a publicação no ambiente `production` e aguarda todos os
[checks](../../.github/workflows/checks.yml).

O [ADR de deploy](../decisions/007-deploy.md) registra a escolha dessa topologia.

## Destinos

- A API usa a imagem local `oriens-api` com tag do commit. O
  [Compose de produção](../../ops/compose/docker-compose-prod.yml) sobe
  a imagem do SHA em `~/projects/oriens` no VPS, com uploads persistentes em
  `/opt/oriens-uploads` e a rede compartilhada `observability`. O Nginx no host
  alcança a API por `127.0.0.1:${API_PORT}`. O Prometheus acessa `oriens-api:8081`
  pela rede Docker, sem publicar a porta de gerenciamento no host.
- O cliente estático é publicado em `/var/www/oriens`. O Nginx do VPS serve esse
  diretório e encaminha a API e as rotas MCP/OAuth. O operador administra a
  configuração do Nginx no VPS. [Instalação e rollback do Nginx](../../ops/nginx/README.md)

## Fluxo

O workflow chama [scripts/deploy.sh](../../scripts/deploy.sh) em duas fases. As
credenciais da VPS ficam no workflow, que configura o alias SSH `vps` com
verificação da chave do host. As credenciais de banco e MCP são passadas só à
fase de publicação.

| Comando | Entrada e execução |
|---|---|
| `./scripts/deploy.sh build` | `IMAGE_TAG` com o SHA completo do commit. Executa `npm ci` e `npm run build` em `apps/client` e constrói a imagem a partir de `apps/api`. O workflow fornece a chave pública do Google Maps ao cliente. |
| `./scripts/deploy.sh publish` | Mesmo checkout, SHA, distribuição e imagem da fase de build. Usa o alias `vps`, `REMOTE_DIR`, `WEB_ROOT`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `API_PORT` e `ORIENS_MCP_ENABLED`. Com MCP habilitado, também recebe issuer, origem do frontend, senha de criptografia e salt. `ROLLBACK_COMPATIBLE_PAIR` é opcional. `ORIENS_NGINX_APPLY` é falso por padrão. |

A publicação envia a imagem via `docker save` e SSH, prepara o Compose e o `.env`
em arquivos temporários e confere os uploads com o UID/GID da candidata. Execute
com uma versão do Docker Compose que suporte `up --wait --wait-timeout`.
Com `ORIENS_NGINX_APPLY=true`, a publicação também prepara o vhost versionado e,
depois das verificações prévias, chama o instalador no host antes de substituir
a API. O vhost exige `API_PORT=8080` e `WEB_ROOT=/var/www/oriens`. Falha no
instalador interrompe a publicação antes de trocar a API ou extrair a SPA.
[Provisionamento e rollback do Nginx](../../ops/nginx/README.md)

O healthcheck interno exige HTTP 200 do Actuator `/actuator/health/readiness`
na porta 8081. A prontidão exige o startup completo, incluindo Flyway e a
validação do Hibernate, e acesso ao PostgreSQL. O Compose aguarda até 360 s.
Depois da prontidão, o script guarda a antiga `latest` em `previous`, promove
a configuração, aponta `latest` para a candidata e extrai a SPA em `WEB_ROOT`.

## Falha e rollback

Se a API candidata falhar, o job registra os logs, para o container da candidata
quando presente e termina com erro. A configuração ativa, a tag `latest` e a
distribuição anterior ficam disponíveis para recuperação. A política de retenção
de imagens deve preservar os SHAs necessários antes de remover imagens antigas.
Se o vhost já foi validado e instalado, ele continua atendendo no mesmo upstream.

Para autorizar rollback automático, configure no ambiente `production` do
GitHub a variável `ROLLBACK_COMPATIBLE_PAIR` com `SHA_CANDIDATA:SHA_ANTERIOR`
após provar o par em PostgreSQL isolado com o schema e dados representativos da
candidata. O script exige que a tag e o rótulo OCI do SHA anterior identifiquem
a mesma imagem que a `latest` e que ela traga healthcheck. A versão anterior é
recriada com o Compose e o `.env` anteriores. Confira a prontidão no log do job.

Em recuperação manual, mantenha as escritas suspensas. Identifique o SHA e o
ID da imagem exata, os checksums/histórico do Flyway e a configuração da versão.
Ensaie a volta com um movimento de carteira e seu lançamento já vinculados.
A V15 mantém o lançamento acessível ao escritor anterior ao PR #51. Esse escritor
pode editar o valor e a data do lançamento sem atualizar o movimento. Valide que
a edição direta é recusada e que valores, datas e vínculo coincidem antes de
reabrir escritas. Inclua metadados e arquivos de anexos no ensaio. [PR #51](https://github.com/Guga2111/Oriens/pull/51)

Com a versão comprovada e a recuperação autorizada, aponte `oriens-api:latest`
para o SHA aprovado e recrie só `api` com a configuração e o `.env` compatíveis
em `~/projects/oriens`. Reponha a distribuição correspondente se a extração da
SPA já tiver começado. Valide API, uploads, rotas e métricas antes de liberar
tráfego. Com incompatibilidade, mantenha manutenção e corrija para frente.
Uma restauração do banco e do volume exige decisão explícita sobre as escritas
posteriores ao backup. [Backup e restore](database-operations.md) ·
[Operação do MCP](mcp-operations.md).

## Prova isolada

Os testes executam o shell local e remoto com substitutos para npm, Docker,
SSH e SCP. Valide na raiz com os comandos abaixo.

```sh
bash -n scripts/deploy.sh
bash -n apps/api/healthcheck.sh
python3 -B -m unittest discover -s scripts/tests -p 'test_deploy.py' -v
```

## Inventário de entradas

| Entrada | Consumidor conhecido |
|---|---|
| `apps/api/Dockerfile` | Build local do Compose de desenvolvimento e do workflow de release, via `scripts/deploy.sh` |
| `ops/compose/docker-compose.dev.yml` | Setup local com PostgreSQL de desenvolvimento |
| `ops/compose/docker-compose-prod.yml` | Publicação da API no VPS via workflow Deploy |
| `ops/compose/docker-compose.yml` | Modelo histórico de ECR/EC2 com placeholder de conta. Removido após confirmar a ausência de consumidores no repositório |
| `deploy-oriens.sh` | Citado no plano histórico de observabilidade. Verificar presença e consumidores no inventário autorizado da VPS |

## Anexos privados de tarefas

A API guarda os arquivos em `/opt/oriens-uploads/task-attachments`, no volume
persistente do Compose. O diretório precisa ser gravável pelo container e fica
fora dos diretórios estáticos do Nginx. O backup precisa incluir esse diretório
e os metadados do PostgreSQL do mesmo ponto de recuperação. Teste o restore
com os dois antes de depender dele. [Backup e restore do banco](database-operations.md)

Na primeira adoção, inventarie o bind existente durante manutenção e faça o
backup antes de ajustar permissões. Mantenha o mesmo caminho e os arquivos dos
três diretórios `profile-pictures`, `projects-pictures` e `task-attachments`.
Para um host novo, crie a raiz com `sudo install -d -m 0750 -o 10001 -g 10001 /opt/oriens-uploads`.
Em um host existente, o operador deve conceder ao UID/GID `10001:10001` acesso
de leitura aos arquivos e travessia, leitura e escrita nos diretórios, sem
ampliar o acesso a outros usuários. O pré-teste do deploy rejeita tipos
inesperados, inclusive links, e falha antes de substituir a API se o bind
estiver ausente ou inacessível.

O Nginx remove o prefixo `/api` e limita o corpo do upload binário nessa rota a
20 MiB. O download conserva `Range`. Os logs de acesso preservam o caminho,
sem a query assinada, e a rota de download descarta o error log da requisição.

Para verificar o ambiente, envie e abra uma imagem e um vídeo com uma conta
de teste. Em seguida, resolva um anexo pelo MCP e confirme o download por HTTPS.
O diretório e as referências persistem ao recriar a API.
Arquivos removidos do documento ou uploads pendentes ficam disponíveis para
reedição por 24 horas. A rotina de limpeza também recolhe arquivos de tarefas
excluídas.
