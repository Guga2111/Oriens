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
| Coleta e painéis | **Stack compartilhada da VPS** (revisão de 2026-11-20, aprovada): o Prometheus e o Grafana de `grafana.luisgosampaio.com` já existem, versionados em FutspringV2 `ops/observability`. O Oriens não sobe stack própria |
| Entrega | PR #12 no Oriens (API + rede) e PR para `dev` no FutspringV2 (job de coleta + painel); deploy e evidência com dados reais vêm depois (#63) |

> **Revisão de 2026-11-20.** A primeira versão desta spec subia Prometheus v3.16.0 e Grafana 13.3.1
> próprios no compose do Oriens, com Grafana em `127.0.0.1:3000` e o secret `GRAFANA_ADMIN_PASSWORD`.
> Ao inspecionar a VPS, vimos que `grafana.luisgosampaio.com` já é servido por uma stack compartilhada
> (Prometheus, Grafana, Loki, Alloy, cAdvisor, node-exporter, alertas no Telegram) na rede Docker externa
> `observability`, e que a porta 3000 já é do `vap-web`. O desenho passou a reutilizar essa stack.

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

## 2. Coleta pela stack compartilhada (#61)

A stack vive em FutspringV2 `ops/observability/` e é publicada em `~/observability` na VPS pelo workflow
`deploy-observability.yml` daquele repositório (push em `main` que toque `ops/observability/**`). O
`prometheus.yml` dela descreve o contrato: um projeto entra ligando o container à rede externa
`observability` e ganhando um job.

**No Oriens** (`docker-compose-prod.yml`): o serviço `api` entra nas redes `default` e `observability`
(declarada `external: true`). Como no deploy do Futspring, o `deploy.yml` roda
`docker network create observability || true` antes do `compose up`, então não importa quem sobe
primeiro. A 8081 continua fora de `ports:`.

**No FutspringV2** (PR para `dev`):
- `prometheus/prometheus.yml`: job `oriens-api`, `metrics_path: /actuator/prometheus`, alvo
  `oriens-api:8081` (nome do container; Tomcat recusa Host com `_`, e `oriens-api` não tem), label
  `project: oriens`. Coleta a cada 30s (global da stack).
- `grafana/provisioning/dashboards/json/oriens-api.json`: o painel (#62). Datasource uid
  `prometheus`, o mesmo da stack.
- README da stack: o Oriens passa a constar como projeto coletado.

Os alertas da stack filtram por `job="futspring-api"`, `application="futspring"` ou
`name="futspring_api"`, então o alvo novo não dispara nada. Alertas do Oriens ficam fora de escopo.

**Ordem do rollout:** deploy do Oriens (a API entra na rede) e só depois o deploy da stack com o job
novo, para o alvo não aparecer como fora do ar.

## 3. Painel versionado (#62)

`oriens-api.json` no provisionamento do Grafana compartilhado (FutspringV2
`ops/observability/grafana/provisioning/dashboards/json/`). É somente leitura: muda-se o painel pelo
repositório. Variável `uri` (multi, padrão "All"). Requisições do Prometheus ao `/actuator/**` ficam
fora das consultas. O painel JVM (Micrometer) da stack também passa a listar o Oriens pelo tag
`application`.

| Linha | Painéis | Consulta base |
|---|---|---|
| Saúde | API no ar, uptime | `up{job="oriens-api"}`, `process_uptime_seconds` |
| Tráfego | req/s por rota | `sum by (uri) (rate(http_server_requests_seconds_count[5m]))` |
| Latência | p50 / p95 / p99 por rota | `histogram_quantile(q, sum by (le, uri) (rate(http_server_requests_seconds_bucket[5m])))` |
| Erros | taxa de 4xx e 5xx por rota | `…_count{status=~"4.."}` e `{status=~"5.."}` sobre o total |
| JVM | heap usado/máximo, pausas de GC, threads | `jvm_memory_used_bytes{area="heap"}`, `jvm_gc_pause_seconds_*`, `jvm_threads_live_threads` |
| Banco | conexões ativas / ociosas / pendentes, tempo de aquisição | `hikaricp_connections_*`, `hikaricp_connections_acquire_seconds_*` |

## 4. Testes, deploy e evidência (#63)

- Nos PRs: `ActuatorExposureTest` na suíte H2 do CI, `docker compose -f docker-compose-prod.yml config`
  para validar o compose, `promtool check config` no `prometheus.yml` da stack e validação do JSON
  do painel.
- Depois dos merges: deploy do Oriens em `main`, depois deploy da stack (FutspringV2 `main`),
  conferência de que o alvo `oriens-api` aparece `UP` no Prometheus e de que o painel mostra dados reais, e
  `docs/plans/AAAA-MM-DD-observability-evidence.md` (como acessar, o que cada painel mostra, como
  adicionar métricas). A #63 fica em "Fazendo" até lá.

### Evidência local (2026-11-19)

Feita com o desenho original: jar da API com Postgres 15 descartável, e Prometheus v3.16.0 e Grafana
13.3.1 locais com o mesmo painel e datasource uid `prometheus`. A API e o painel não mudaram com a
revisão; só a stack que coleta passou a ser a compartilhada.
- `:8080/actuator/prometheus` → 401 e sem métricas no corpo; `:8081/actuator/prometheus` → 200;
  `:8081/actuator/health` → `{"status":"UP"}`.
- Prometheus: alvo `up=1`; `http_server_requests` por rota com templates (`/user/{id}`,
  `/api/auth/forgot-password`, `UNKNOWN`); 30 séries de bucket no total.
- Grafana: datasource `prometheus` saudável; painel "Oriens API" provisionado;
  anônimo → 401. Todas as 23 consultas do painel retornam dados. A única exceção é "Taxa de 5xx
  por rota", que fica vazia quando não há erro 5xx (o stat geral mostra 0).
- `promtool check config` e `docker compose -f docker-compose-prod.yml config` passaram.

### Evidência local da topologia compartilhada (2026-11-20)

Imagem da API construída do branch e subida pelo próprio `docker-compose-prod.yml` (rede externa
`observability`), mais Prometheus v3.15.1 e Grafana OSS 13.0.2 (as versões da stack), com o
`prometheus.yml` e o provisionamento de datasources/dashboards do branch do FutspringV2.
- `docker port oriens-api`: só a 8080; a 8081 não é publicada. `:API_PORT/actuator/prometheus` → 401.
- Alvo `oriens-api` → `http://oriens-api:8081/actuator/prometheus` **up**, resolvido pelo nome do
  container na rede `observability`. Os alvos da stack que não existem localmente aparecem fora do ar, como esperado.
- Grafana: "Oriens API" provisionado; as 23 consultas, feitas pelo proxy do datasource `prometheus`,
  retornam dados. A única vazia é "Taxa de 5xx por rota", porque não houve erro 5xx.

## Fora de escopo

Alertas do Oriens na stack, logs/traces, métricas de negócio customizadas, métricas do front,
fechar a porta 8080 publicada em `0.0.0.0` (dívida registrada) e o `deploy-oriens.sh` legado (#68).

## Rollback

Remover o job e o painel no FutspringV2 e publicar a stack; reverter o PR do Oriens e fazer o deploy
(a API sai da rede `observability`). Não há mudança de schema nem de contrato público da API.

## Riscos

- **Rede compartilhada**: na rede `observability` a API também responde pelo alias `api` (nome do
  serviço). O job usa o nome do container, que é único; outro projeto com serviço `api` nessa rede
  não afeta a coleta do Oriens.
- **Volume do Prometheus**: algumas dezenas de séries novas (buckets SLO por rota); a stack já tem
  retenção de 15 dias e limite de 2 GB.
- **Overhead na API**: o Micrometer é barato, mas a 8081 abre mais um Tomcat (poucas threads ociosas).
  Aceitável dentro do limite de 512M.
