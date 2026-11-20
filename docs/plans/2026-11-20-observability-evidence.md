# Observabilidade — evidência de produção

Data: 2026-11-20 · Objetivo Oriens 13 · Tarefas #60–#63 · Desenho: `2026-11-19-observability-design.md`

## O que está no ar

| Parte | Onde | Entrega |
|---|---|---|
| Métricas da API | `oriens-api`, porta de gerenciamento **8081** (não publicada) | Oriens #12 → `dev`, release #13 → `main` (`649551a`) |
| Coleta e painel | stack compartilhada da VPS (FutspringV2 `ops/observability`) | FutspringV2 #145 → `dev`, release #146 → `main` (`530f563`) |

Deploy do Oriens (run `44773985096`): checks e deploy verdes; a API subiu às 16:35 UTC.

## Verificações em produção (2026-11-20, ~16:50 UTC)

- **Isolamento**
  - `docker port oriens-api` lista só a 8080.
  - `https://oriens.luisgosampaio.com/api/actuator/prometheus` → **401**.
  - A 8081 do host é do futspring, não do Oriens.
- **Rede:** `oriens-api` está nas redes `observability` e `oriens_default`; o Prometheus resolve `oriens-api` → `172.27.0.9`.
- **Coleta:** `up{job="oriens-api", instance="oriens-api:8081", project="oriens"}` = **1**. A coleta de dentro do container `prometheus` devolve cerca de 46 KB de métricas, com buckets de latência, `hikaricp_connections` e `process_uptime_seconds`.
- **Tráfego real:** chamadas MCP feitas pelo Claude Code aparecem como
  `http_server_requests_seconds_count{uri="/mcp", method="POST", status="200"}`.
- **Painel:** `oriens-api.json` está provisionado em `/root/observability/grafana/provisioning/dashboards/json/`, e o Grafana não registrou erro de provisionamento. Rodei as 23 consultas do painel direto no Prometheus de produção:
  - saúde, uptime, heap, GC, CPU/threads e as quatro séries do pool Hikari retornam valores;
  - as consultas HTTP (req/s, quantis, 4xx) já têm séries e se preenchem com o uso, porque a taxa precisa de duas coletas depois do tráfego;
  - "Taxa de 5xx por rota" fica vazia enquanto não há erro 5xx.

### Observações

- O `wget` do busybox dentro do container `prometheus` não resolve nomes de um rótulo só (`oriens-api`) nesta VPS. Com `oriens-api.` (nome absoluto) resolve. O mesmo vale para o `futspring-api`, que o Prometheus coleta normalmente. O resolvedor do Go não tem esse problema, então os alvos funcionam como estão.
- O deploy da stack (`CD - Deploy observability stack`, run `44775315382`) **falhou no smoke test**, por uma razão alheia ao Oriens:
  - o teste exige que o Grafana tenha exatamente as regras de `rules.yml`; o `main` tem 10 e o Grafana tem 16;
  - as 6 extras vêm do trabalho de backups do FutspringV2 (`4345ee9`, ainda não enviado), cuja versão de `rules.yml` foi publicada na VPS fora do workflow, e o provisionamento do Grafana não apaga regras que saem do arquivo;
  - todo o resto do teste passou: Grafana 200, Telegram provisionado, Loki pronto e nenhum alvo fora do ar, inclusive `oriens-api`.

## Como acessar

1. `https://grafana.luisgosampaio.com`: login de admin da stack (senha no secret `GRAFANA_ADMIN_PASSWORD` do FutspringV2, e não no Oriens).
2. Painel **Oriens API** (uid `oriens-api`). O painel **JVM (Micrometer)** da stack também lista o Oriens pelo tag `application`.
3. Logs: o Alloy da stack já envia os logs do container `oriens-api` para o Loki (Explore → Loki, label `project="oriens"`).

## O que cada painel mostra

| Linha | Painel | Leitura |
|---|---|---|
| Saúde | API no ar · Uptime · Requisições/s · Taxa de 5xx | coleta OK, tempo desde o último boot, volume total e fração de erros do servidor (5 min) |
| Tráfego e latência | req/s por rota · p50/p95/p99 geral · p50, p95 e p99 por rota | quantis estimados pelos buckets SLO (25 ms a 10 s). O p95 por rota é a linha de base do objetivo 7 (N+1) |
| Erros | taxa de 4xx e de 5xx por rota | fração das respostas de cada rota |
| JVM | heap usado/reservado · tempo em pausa de GC · CPU do processo e threads | CPU de 0 a 1, relativa ao limite de 1 CPU do container |
| Banco (Hikari) | conexões ativas/ociosas/aguardando/máximo · tempo para obter conexão | conexões "aguardando" acima de 0 indicam pool saturado |

A variável **Rota** filtra todos os painéis HTTP. As requisições do próprio Prometheus a `/actuator/**` ficam fora das consultas.

## Como adicionar métricas

1. **Métrica de negócio na API:** injetar `MeterRegistry` no serviço e registrar um `Counter` ou `Timer` com nome em `oriens.*` e tags de cardinalidade baixa (nunca ids). O tag `application="oriens-api"` é aplicado automaticamente.
2. **Painel:** editar `ops/observability/grafana/provisioning/dashboards/json/oriens-api.json` no FutspringV2. O painel é somente leitura no Grafana. O deploy da stack roda num push para `main` que toque `ops/observability/**`.
3. **Latência de um timer novo:** para ter quantis, configurar buckets em `management.metrics.distribution.slo.<nome>` no `application.properties`, como já é feito com `http.server.requests`.
4. **Alertas:** ainda não há regras para o Oriens. Elas entram em `ops/observability/grafana/provisioning/alerting/rules.yml` no FutspringV2, filtrando por `application="oriens-api"`.
