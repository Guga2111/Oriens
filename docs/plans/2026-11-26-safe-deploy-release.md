# Plano de release e rollout seguro

Escopo do PR 2 para `dev`, tarefas Oriens #68 e #67. O PR prepara a entrega.
A promoção de `dev` para `main` tem revisão própria, e a preparação e o rollout
na VPS exigem autorização do operador.

## Provas da imagem e de rollback

O ensaio usou imagens reconstruídas a partir do código, PostgreSQL 15 e dados
sintéticos em rede Docker isolada. A candidata executou como `10001:10001`, o
Flyway aplicou V1 a V15 antes da prontidão e o endpoint deixou de responder com
200 ao parar o banco. O scrape de Prometheus funcionou na porta interna 8081.

Na mesma base e no mesmo volume, a imagem de `59b4ede` (release #51) preservou
o movimento de carteira vinculado e recusou a edição direta do lançamento com
HTTP 422. O link de anexo respondeu HTTP 206 com os bytes esperados. O ensaio
também passou pela imagem `fa83a27`, que usa V1 a V13. Ela iniciou sobre V15 e
aceitou modificar o valor e a data do lançamento sem modificar o movimento.
Essa imagem fica excluída da recuperação sobre V15. A imagem da release #51
depende de recuperação manual por anteceder o healthcheck da candidata.

Os testes de shell exercitaram a troca de imagem apenas para o par aprovado,
o bloqueio da publicação da SPA em falha e a rejeição de permissões de volume
insuficientes. O Nginx descartável validou e recarregou configurações sintéticas,
recusou sintaxe inválida e restaurou a configuração anterior. O vhost efetivo
do Oriens, seus includes e a paridade de rotas e TLS aguardam fonte autorizada.

## Antes da promoção para `main`

1. Derive o vhost versionado da configuração efetiva sanitizada. Compare os
   paths e includes TLS, redirecionamento HTTP, SPA, `/api`, `/mcp`, `/oauth2`,
   `/.well-known` e os destinos de log e observabilidade. Valide no mesmo Nginx
   ou em versão equivalente, com certificados sintéticos no ensaio.
2. Prove HTTPS e rotas em rede isolada. Confira fluxo MCP e OAuth, upload de
   até 20 MiB, download 206 com `Range`, `Cache-Control: no-store` e ausência
   da query assinada nos logs. Confira acesso à métrica pela rede Docker e
   exposição do backend apenas no loopback do host.
3. Abra a promoção para `main` com o intervalo completo e as duas revisões do
   head. Identifique os SHAs e IDs das imagens, checksums Flyway, configuração,
   SPA e conjunto de backup recuperável. Se houver outra migração no intervalo,
   repita sobre o schema e as escritas esperadas dessa promoção.
4. Prove o par exato da promoção em dados sintéticos representativos. Autorize
   o par no ambiente `production` somente depois de registrar a prova e quando
   a anterior já tiver o healthcheck. Caso contrário, prepare recuperação
   manual com a imagem compatível. [Procedimento de recuperação](../guides/deploy.md#falha-e-rollback)

## Rollout autorizado

1. Acorde a janela com o operador antes do merge para `main`, que dispara o
   deploy. Em manutenção, suspenda os escritores, registre versão e estado da
   API e capture backup consistente de banco, uploads e vhost. Confira o restore
   em ambiente isolado. [Backup e restore](../guides/database-operations.md)
2. Confira a origem do `deploy-oriens.sh` e seus invocadores na VPS, incluindo
   unidades/timers, crontabs e pipelines ativos. Registre consumidores antes de
   aprovar a retirada de qualquer entrada legada. Prepare o UID/GID dos uploads
   no bind existente e confirme que o upstream vigente usa o loopback correto.
   [Diretório de anexos](../guides/deploy.md#anexos-privados-de-tarefas)
3. Instale o vhost revisado na janela aprovada, preserve a configuração anterior
   e verifique rotas e TLS na API em execução. Com a API candidata pronta,
   confirme versão, login, SPA, MCP/OAuth, upload, download, ausência de assinatura
   nos logs e scrape do Prometheus. Libere tráfego depois dessas verificações.
4. Em falha, mantenha manutenção e recupere o vhost e a aplicação conforme os
   guias. Preserve o backup e as escritas posteriores para uma eventual decisão
   de recuperação de dados. [Instalação e rollback do Nginx](../../ops/nginx/README.md)
