# Dependências da API

O [`pom.xml`](../../apps/api/pom.xml) e o parent/BOM do Spring Boot determinam
as versões. Confira a árvore resolvida com `./mvnw dependency:tree` em `apps/api`.
Este guia agrupa as dependências diretas por responsabilidade.

| Responsabilidade | Artefatos | Uso |
|---|---|---|
| HTTP e validação | `spring-boot-starter-webmvc`, `spring-boot-starter-validation` | `controller/`, DTOs de comandos, MVC e Bean Validation |
| Autenticação REST | `spring-boot-starter-security`, `java-jwt` | `security/`, filtros e algoritmo JWT |
| Integração delegada | `spring-boot-starter-security-oauth2-authorization-server`, `mcp-spring-webmvc`, `mcp` | `mcp/McpSecurity` e `McpTransport`, fluxo OAuth, transporte e tipos de protocolo |
| Persistência | `spring-boot-starter-data-jpa`, `postgresql` (runtime) | `repository/`, entidades e datasource PostgreSQL |
| Migrações | `spring-boot-starter-flyway`, `flyway-database-postgresql` | Inicialização e SQL em [`db/migration`](../../apps/api/src/main/resources/db/migration/) |
| Descrição Markdown | `commonmark`, `commonmark-ext-gfm-tables`, `commonmark-ext-gfm-strikethrough`, `commonmark-ext-task-list-items` | `service/TaskDescriptionCodec`, conversão de Markdown, tabelas, tachado e listas de tarefas |
| Observabilidade | `spring-boot-starter-actuator`, `micrometer-registry-prometheus` (runtime) | Health e scrape na cadeia de gerenciamento em `security/SecurityConfig` |
| Desenvolvimento e compilação | `spring-boot-devtools` (runtime opcional), `lombok` | Devtools em execução local, Lombok como processador de anotações para entidades, serviços e DTOs |
| Suporte Spring | `spring-context-support` | Artefato direto no POM. A busca pelo código da API encontrou a declaração e nenhum consumidor direto de suas integrações de mail, cache, Quartz ou FreeMarker |
| Base de testes | `spring-boot-starter-test`, `h2` | JUnit, Mockito, AssertJ e datasource do perfil `test` |
| Testes por fronteira | `spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, `spring-boot-starter-actuator-test`, `spring-security-test` | MockMvc e slices Web/JPA, testes de Actuator e autenticação em `src/test/java` |

A remoção de Twilio consta no [PR 37](https://github.com/Guga2111/Oriens/pull/37).
O SDK, imports e configuração Twilio estavam ausentes no POM e nas fontes
ativas na revisão deste catálogo. Candidatos a remoção precisam de análise da
árvore resolvida e prova em entrega própria.

- [Estrutura e camadas da API](../conventions/backend/structure.md)
- [Testes da API](../conventions/backend/tests.md)
- [Política de auditoria no CI](../ci-security.md)
