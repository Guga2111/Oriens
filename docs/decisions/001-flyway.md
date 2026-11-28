# ADR 001 · Flyway e validação de schema

## Contexto

A API sobe sobre PostgreSQL persistente. A migração de Projetos também precisava
adotar um schema legado sem sobrescrever dados existentes.

## Decisão vigente

O Flyway executa migrações SQL versionadas de
[`db/migration`](../../apps/api/src/main/resources/db/migration/).
Hibernate valida o resultado com `ddl-auto=validate` nos perfis
[dev](../../apps/api/src/main/resources/application-dev.properties) e
[prod](../../apps/api/src/main/resources/application-prod.properties).
A [entrega de Projetos](../plans/2026-11-13-projects-refactor-p0.md) registra a
adoção controlada do schema legado.

## Alternativas

Usar `ddl-auto=update` deixaria a evolução por conta do ORM na inicialização,
com menos controle sobre SQL, backfill e sequência. Executar SQL manualmente
separaria a evolução do código que depende dela.

## Consequências

Mudanças entram em novas migrações, com ensaios em PostgreSQL e atenção à
compatibilidade com a imagem anterior. Consulte [persistência](../conventions/backend/persistence.md)
e [backup e restore](../guides/database-operations.md).
