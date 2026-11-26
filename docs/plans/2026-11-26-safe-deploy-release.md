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

Os testes de shell exercitaram a troca de imagem para o par aprovado, o
bloqueio da publicação da SPA em falha e a rejeição de permissões de volume
insuficientes. Também exercitaram o caminho completo de publicação com o proxy
habilitado. Uma candidata Nginx inválida restaurou o vhost anterior e impediu
a troca da API e a extração da SPA.

## Origem do vhost

A inspeção autorizada em leitura confirmou Nginx 1.24.0 (Ubuntu) em execução,
com `/etc/nginx/sites-enabled/oriens` apontando para
`/etc/nginx/sites-available/oriens`. Foram conferidos os includes HTTP padrão,
o log compartilhado, o upstream na porta 8080, os caminhos do Certbot e seu
include TLS. O vhost e os defaults HTTP consultados não declaravam
`client_max_body_size`. O vhost versionado preserva os vínculos do Certbot,
usa loopback IPv4 e explicita os 20 MiB do upload binário de vídeo. A cópia
sanitizada foi usada como referência para o único vhost versionado.
[Vhost do Oriens](../../ops/nginx/oriens.conf)

## Prova do proxy e do CD

O ensaio com Nginx 1.24.0 (Ubuntu), PostgreSQL 15 e certificados sintéticos
validou o redirecionamento HTTP, HTTPS com verificação de certificado, SPA,
prefixo `/api`, metadados OAuth, cookie reescrito, consentimento PKCE e
inicialização MCP. O endpoint de métricas respondeu na porta gerencial interna.
A mesma rota por `/api` não expôs as métricas.

O upload binário de vídeo retornou 201 com 20 MiB e 413 com um byte adicional.
O download assinado retornou 206, os bytes esperados e `Cache-Control: no-store`.
Os logs conservaram caminho e status e omitiram as queries sensíveis, inclusive
com o upstream fora do ar, a SPA sem seu arquivo de entrada e no redirect HTTP.
O instalador rejeitou sintaxe inválida, restaurou o arquivo anterior e provou
rollbacks com reload real. O teste de shell verificou o fluxo do CD com as duas
opções de aplicação do proxy, a ordem até a SPA e a interrupção em falha.
[Comandos do ensaio](../../ops/nginx/README.md#teste-isolado)

## Antes da promoção para `main`

1. Revalide o vhost do head da promoção em Nginx equivalente e rede isolada.
   Confira redirecionamento HTTP, TLS, SPA, prefixo `/api`, MCP/OAuth, vídeo de
   20 MiB, download `Range`, sanitização de logs e métrica interna.
   [Prova reproduzível](../../ops/nginx/README.md#teste-isolado)
2. Abra a promoção para `main` com o intervalo completo e as duas revisões do
   head. Identifique os SHAs e IDs das imagens, checksums Flyway, configuração,
   SPA e conjunto de backup recuperável. Se houver outra migração no intervalo,
   repita sobre o schema e as escritas esperadas dessa promoção.
3. Prove o par exato da promoção em dados sintéticos representativos. Autorize
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
3. Provisione o instalador revisado no host e conceda a invocação documentada ao
   usuário de deploy. Confirme o vínculo do Certbot, os caminhos do vhost e a
   proteção do ambiente `production`. Habilite `ORIENS_NGINX_APPLY=true` quando
   o operador autorizar a aplicação pelo CD. [Provisionamento](../../ops/nginx/README.md#instalação-e-rollback)
4. Na janela aprovada, confira o backup e o reload do vhost no CD. Com a API candidata pronta,
   confirme versão, login, SPA, MCP/OAuth, upload, download, ausência de assinatura
   nos logs e scrape do Prometheus. Libere tráfego depois dessas verificações.
5. Em falha, mantenha manutenção e recupere o vhost e a aplicação conforme os
   guias. Preserve o backup e as escritas posteriores para uma eventual decisão
   de recuperação de dados. [Instalação e rollback do Nginx](../../ops/nginx/README.md)
