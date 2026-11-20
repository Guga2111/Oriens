# Observabilidade (Prometheus + Grafana) — desenho

Data: 2026-11-19 · Branch: `feat/observability` · Objetivo Oriens 13 · Tarefas #60, #61, #62 e #63

## Problema

A API não expõe métricas. Não há como ver latência por rota, taxa de erro, memória da JVM ou o pool de
conexões com o Supabase. Sem essa linha de base, o objetivo de Performance (N+1, obj. 7) não tem como
medir antes e depois.

## Decisões (aprovadas em 2026-11-19)

| Tema | Decisão |
|---|---|
| Dependências | `spring-boot-starter-actuator` + `micrometer-registry-prometheus` (versões do Boot 3.5.6) |
| Isolamento | Actuator na **porta de gerenciamento 8081**, nunca publicada no host e fora do nginx; na 8080 `/actuator/**` não existe |
| VPS | DNS e secret do GitHub ficam com o dono; nginx + certbot aplicados por SSH no momento do deploy |
| Entrega | Um PR para `dev`; deploy e evidência com dados reais vêm depois (#63) |

## 1. Métricas na API (#60)

`application.properties`, para todos os perfis:

```properties
management.server.port=8081
management.endpoints.web.exposure.include=health,prometheus
management.metrics.tags.application=oriens-api
# SLO buckets em vez do histograma completo: ~10 séries por rota, suficiente para p50/p95/p99.
# Durações inteiras: o Spring não aceita "2.5s".
management.metrics.distribution.slo.http.server.requests=25ms,50ms,100ms,250ms,500ms,1s,2500ms,5s,10s
# O starter-mail registraria um health check que abre conexão SMTP a cada coleta.
management.health.mail.enabled=false
```

Isso já traz `http_server_requests_seconds_*` por `uri` (template, cardinalidade limitada), `method`,
`status` e `outcome`, além de `jvm_*`, `process_*` e `hikaricp_connections_*`.

**Segurança, em camadas:**
1. A porta 8081 não aparece em `ports:` do compose. Só os containers da rede interna do compose a
   alcançam, e o nginx só faz proxy para a 8080.
2. Na 8080 o actuator não é servido: `/actuator/prometheus` responde 401 sem token e 404 com token, e
   nunca entrega métricas.
3. O Spring Security também roda no contexto de gerenciamento. Uma `SecurityFilterChain` dedicada
   (`securityMatcher(EndpointRequest.toAnyEndpoint())`, `@ConditionalOnManagementPort(DIFFERENT)`)
   libera só `health` e `prometheus` e nega qualquer outro endpoint que venha a ser exposto. Sem
   ela, a cadeia JWT bloquearia o Prometheus. Caminhos que não são endpoints expostos (por exemplo
   `/actuator/env`) caem na cadeia JWT e recebem 401. Se a porta de gerenciamento voltar a ser a
   mesma da aplicação, a cadeia nem é criada e as métricas exigem JWT, em vez de ficarem públicas.

**Teste** (`ActuatorExposureTest`, H2, `RANDOM_PORT` + `management.server.port=0`; precisa de
`@AutoConfigureObservability`, porque testes desligam a exportação de métricas por padrão):
- Na porta de gerenciamento, `/actuator/prometheus` responde 200 com `http_server_requests_seconds_bucket`,
  o tag `application="oriens-api"`, `jvm_memory_used_bytes` e `hikaricp_connections`, e
  `/actuator/health` responde 200.
- Na porta da aplicação, `/actuator/prometheus` responde 401 sem JWT e não responde 200 com JWT;
  nenhuma das respostas contém métricas.
- Na porta de gerenciamento, `/actuator`, `env`, `beans` e `heapdump` não respondem 200.

## 2. Prometheus e Grafana no compose de produção (#61)

Arquivos novos em `observability/`, na raiz do repositório, ao lado de `docker-compose-prod.yml`:

```
observability/
  prometheus/prometheus.yml                      scrape api:8081/actuator/prometheus a cada 30s
  grafana/provisioning/datasources/prometheus.yml  datasource uid fixo "prometheus"
  grafana/provisioning/dashboards/oriens.yml     provider lendo /var/lib/grafana/dashboards
  grafana/dashboards/oriens-api.json             painel (#62)
```

Serviços novos no `docker-compose-prod.yml`:

| Serviço | Imagem | Portas | Persistência | Limites |
|---|---|---|---|---|
| `prometheus` | `prom/prometheus:v3.16.0` | nenhuma | volume `prometheus-data`; retenção `15d` e `1GB` | 0.25 CPU, 256M |
| `grafana` | `grafana/grafana:13.3.1` | `127.0.0.1:3000:3000` (só loopback, para o nginx do host) | volume `grafana-data` | 0.25 CPU, 256M |

Grafana: `GF_SECURITY_ADMIN_PASSWORD` vem do `.env` (secret `GRAFANA_ADMIN_PASSWORD`),
`GF_USERS_ALLOW_SIGN_UP=false`, `GF_AUTH_ANONYMOUS_ENABLED=false`,
`GF_SERVER_ROOT_URL=https://grafana.luisgosampaio.com`, `GF_SECURITY_COOKIE_SECURE=true` e analytics
desligado. A senha de admin só vale no primeiro boot (fica no volume); depois, troca-se com
`grafana cli admin reset-admin-password`.

**Workflow de deploy** (`deploy.yml`):
- Envia `observability/` para `~/projects/oriens/observability` substituindo a cópia anterior
  (`tar | ssh 'rm -rf … && tar -x'`), para não sobrarem arquivos removidos.
- `GRAFANA_ADMIN_PASSWORD` entra na lista de secrets obrigatórios do `.env` e passa pelas mesmas
  validações.
- O `compose up -d --force-recreate --remove-orphans` atual já sobe os três serviços. O health check
  continua na 8080 da API.

**Na VPS (fora do repositório, aplicado no deploy):**
- Registro DNS `grafana.luisgosampaio.com` → IP da VPS (dono).
- Secret `GRAFANA_ADMIN_PASSWORD` no environment `production` do GitHub (dono).
- Site nginx `grafana` com `proxy_pass http://127.0.0.1:3000`, headers `Host`/`X-Forwarded-*` e
  upgrade de WebSocket (Grafana Live); TLS por `certbot --nginx -d grafana.luisgosampaio.com`.
  Versionar esse `.conf` no repositório é escopo da tarefa #67.
- Antes do merge, confirmar por SSH que a porta 3000 está livre e que há RAM para mais cerca de 512M.

## 3. Painel versionado (#62)

`observability/grafana/dashboards/oriens-api.json`, provisionado (o Grafana não permite salvar
alterações por cima; muda-se o painel pelo repositório). Variável `uri` (multi, padrão "All").

| Linha | Painéis | Consulta base |
|---|---|---|
| Saúde | API no ar, uptime | `up{job="oriens-api"}`, `process_uptime_seconds` |
| Tráfego | req/s por rota | `sum by (uri) (rate(http_server_requests_seconds_count[5m]))` |
| Latência | p50 / p95 / p99 por rota | `histogram_quantile(q, sum by (le, uri) (rate(http_server_requests_seconds_bucket[5m])))` |
| Erros | taxa de 4xx e 5xx por rota | `…_count{status=~"4.."}` e `{status=~"5.."}` sobre o total |
| JVM | heap usado/máximo, pausas de GC, threads | `jvm_memory_used_bytes{area="heap"}`, `jvm_gc_pause_seconds_*`, `jvm_threads_live_threads` |
| Banco | conexões ativas / ociosas / pendentes, tempo de aquisição | `hikaricp_connections_*`, `hikaricp_connections_acquire_seconds_*` |

## 4. Testes, deploy e evidência (#63)

- Neste PR: `ActuatorExposureTest` na suíte H2 do CI, `docker compose -f docker-compose-prod.yml config`
  para validar o compose, `promtool check config` no `prometheus.yml` e validação do JSON do painel.
- Depois do merge em `main` (fora deste PR): DNS, secret, nginx/certbot, deploy acompanhado,
  conferência de que o alvo aparece `UP` no Prometheus e de que o painel mostra dados reais, e
  `docs/plans/AAAA-MM-DD-observability-evidence.md` (como acessar, o que cada painel mostra, como
  adicionar métricas). A #63 fica em "Fazendo" até lá.

### Evidência local (2026-11-19)

Feita antes do PR: jar da API com Postgres 15 descartável, e o Prometheus v3.16.0 e o Grafana 13.3.1
do PR (provisionamento e painel montados direto do repositório).
- `:8080/actuator/prometheus` → 401 e sem métricas no corpo; `:8081/actuator/prometheus` → 200;
  `:8081/actuator/health` → `{"status":"UP"}`.
- Prometheus: alvo `up=1`; `http_server_requests` por rota com templates (`/user/{id}`,
  `/api/auth/forgot-password`, `UNKNOWN`); 30 séries de bucket no total.
- Grafana: datasource `prometheus` saudável; painel "Oriens API" provisionado na pasta "Oriens";
  anônimo → 401. Todas as 23 consultas do painel retornam dados. A única exceção é "Taxa de 5xx
  por rota", que fica vazia quando não há erro 5xx (o stat geral mostra 0).
- `promtool check config` e `docker compose -f docker-compose-prod.yml config` passaram.

## Fora de escopo

Alertas (Alertmanager), logs/traces (Loki/Tempo), métricas de negócio customizadas, métricas do front,
fechar a porta 8080 publicada em `0.0.0.0` (dívida registrada) e o `deploy-oriens.sh` legado (#68).

## Rollback

Reverter o PR e fazer o deploy: `--remove-orphans` derruba `prometheus` e `grafana`. Os volumes ficam
e podem ser apagados com `docker volume rm`. Não há mudança de schema nem de contrato público da API.

## Riscos

- **Memória da VPS compartilhada**: cerca de +512M no pior caso. Mitigação: limites por serviço,
  scrape a 30s e retenção limitada. Conferir a RAM livre antes do deploy.
- **Overhead na API**: o Micrometer é barato, mas a 8081 abre mais um Tomcat (poucas threads ociosas).
  Aceitável dentro do limite de 512M.
