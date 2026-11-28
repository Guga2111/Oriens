# ADR 006 · Layout do monorepo

## Contexto

API e cliente têm ciclos de build próprios. Contratos, operação e automações
precisam acompanhar alterações que atravessam as duas aplicações.

## Decisão vigente

A [entrega #102](../plans/2026-11-24-monorepo-layout-design.md) agrupou as
aplicações em [`apps/api`](../../apps/api/) e [`apps/client`](../../apps/client/).
[`ops/`](../../ops/) guarda Compose, vhost Nginx, inventário e runbooks. [`docs/`](../README.md)
é a entrada de documentação e [`scripts/`](../../scripts/) contém executáveis
de deploy, operação e validação.

## Alternativas

Manter as antigas pastas de aplicação na raiz deixava rotinas e evidências
compartilhadas sob a API. Repositórios separados exigiriam coordenação de
versões e contratos entre entregas.

## Consequências

Cada aplicação mantém seu manifest e o CI configura o diretório de trabalho de
cada ferramenta. Mover caminhos exige atualizar os consumidores, como Compose,
Actions e Dependabot, junto com a mudança. Consulte o [setup](../guides/setup.md).
