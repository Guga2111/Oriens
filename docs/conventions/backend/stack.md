# Dependências da API

O [`pom.xml`](../../../apps/api/pom.xml) declara as dependências diretas e o
parent do Spring Boot, que gerencia parte das versões. Em `apps/api/`, rode
`./mvnw dependency:tree` para consultar a árvore resolvida.

## HTTP, autenticação e MCP

| Artefato | Propósito e local de uso |
|---|---|
| `spring-boot-starter-webmvc` | Servidor servlet, roteamento Spring MVC e serialização JSON nos [controllers REST](../../../apps/api/src/main/java/com/oriens/oriens_api/controller/). |
| `spring-boot-starter-validation` | Bean Validation nos [comandos financeiros](../../../apps/api/src/main/java/com/oriens/oriens_api/entity/dto/financial/FinancialCommands.java) recebidos pelo [controller](../../../apps/api/src/main/java/com/oriens/oriens_api/controller/FinancialEntryController.java). |
| `spring-boot-starter-security` | Cadeias de filtros, autenticação e autorização em [`SecurityConfig`](../../../apps/api/src/main/java/com/oriens/oriens_api/security/SecurityConfig.java). |
| `java-jwt` | Emissão e verificação de JWT nos [filtros de sessão REST](../../../apps/api/src/main/java/com/oriens/oriens_api/security/filters/). |
| `spring-boot-starter-security-oauth2-authorization-server` | Servidor OAuth para as conexões delegadas em [`McpSecurity`](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpSecurity.java). |
| `mcp-spring-webmvc` | Transporte HTTP stateless do MCP via Spring MVC em [`McpTransport`](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpTransport.java). |
| `mcp` | SDK que reúne os tipos do protocolo e servidor MCP e o adaptador JSON Jackson usado em [`McpTransport`](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpTransport.java). |

## Persistência

| Artefato | Propósito e local de uso |
|---|---|
| `spring-boot-starter-data-jpa` | Hibernate e Spring Data JPA para [entidades](../../../apps/api/src/main/java/com/oriens/oriens_api/entity/) e [repositórios](../../../apps/api/src/main/java/com/oriens/oriens_api/repository/). |
| `postgresql` | Driver JDBC de execução para o datasource em [dev](../../../apps/api/src/main/resources/application-dev.properties) e [prod](../../../apps/api/src/main/resources/application-prod.properties). |
| `spring-boot-starter-flyway` | Executa as migrações na inicialização, com os caminhos por SGBD definidos em [`application.properties`](../../../apps/api/src/main/resources/application.properties). |
| `flyway-database-postgresql` | Fornece ao Flyway suporte ao PostgreSQL para rodar as [migrações desse banco](../../../apps/api/src/main/resources/db/migration/postgresql/). |

## Descrição de tarefas

As quatro dependências são usadas no [`TaskDescriptionCodec`](../../../apps/api/src/main/java/com/oriens/oriens_api/service/TaskDescriptionCodec.java),
que converte entre Markdown e o formato estruturado da descrição.

| Artefato | Propósito |
|---|---|
| `commonmark` | Análise e geração do Markdown. |
| `commonmark-ext-gfm-tables` | Tabelas no formato GitHub Flavored Markdown. |
| `commonmark-ext-gfm-strikethrough` | Texto tachado no formato GitHub Flavored Markdown. |
| `commonmark-ext-task-list-items` | Marcadores de itens de listas de tarefas. |

## Operação, desenvolvimento e testes

| Artefato | Propósito e local de uso |
|---|---|
| `spring-boot-starter-actuator` | Endpoints de saúde e prontidão configurados em [`application.properties`](../../../apps/api/src/main/resources/application.properties) e verificados no [healthcheck do contêiner](../../../apps/api/healthcheck.sh). |
| `micrometer-registry-prometheus` | Registro de métricas que disponibiliza `/actuator/prometheus` na porta de gerenciamento, com exposição definida em [`application.properties`](../../../apps/api/src/main/resources/application.properties). |
| `spring-boot-devtools` | Reinício automático quando o classpath muda em execuções de desenvolvimento. O POM declara o artefato opcional e de runtime. |
| `lombok` | Geração de código na compilação, como os builders de [`Task`](../../../apps/api/src/main/java/com/oriens/oriens_api/entity/Task.java). O POM configura o processador de anotações. |
| `spring-boot-starter-test` | Base de JUnit, Mockito e AssertJ nos [testes da API](../../../apps/api/src/test/java/com/oriens/oriens_api/). |
| `spring-boot-starter-webmvc-test` | MockMvc e slices MVC, como em [`McpDisabledSecurityTest`](../../../apps/api/src/test/java/com/oriens/oriens_api/security/McpDisabledSecurityTest.java). |
| `spring-boot-starter-data-jpa-test` | Slices `@DataJpaTest`, como em [`TaskRepositoryTest`](../../../apps/api/src/test/java/com/oriens/oriens_api/repository/TaskRepositoryTest.java). |
| `spring-boot-starter-actuator-test` | Suporte de teste ao Actuator e às métricas, incluindo `@AutoConfigureMetrics` em [`ActuatorExposureTest`](../../../apps/api/src/test/java/com/oriens/oriens_api/security/ActuatorExposureTest.java). |
| `h2` | Banco em memória no [perfil de teste](../../../apps/api/src/main/resources/application-test.properties) e em testes de integração locais. |

## Declarações sem uso localizado

| Artefato | Propósito da biblioteca | Estado no Oriens |
|---|---|---|
| `spring-context-support` | Integrações do Spring com e-mail, cache, Quartz e FreeMarker. | Declarado no POM. A busca nas fontes e configurações da API e `dependency:analyze` indicam ausência de uso. |
| `spring-security-test` | Utilitários de autenticação simulada e integração de segurança com MockMvc. | Declarado no escopo de teste. A busca nas fontes e `dependency:analyze` indicam ausência de uso da biblioteca. Os testes de segurança exercitam filtros ou requisições da aplicação. |

O SDK Twilio foi removido no [PR #37](https://github.com/Guga2111/Oriens/pull/37).
O POM, a árvore de dependências e as fontes e configurações ativas da API
confirmam a remoção.

O Maven analisa referências no bytecode. Confira a árvore e a configuração
antes de interpretar avisos sobre starters, drivers ou módulos carregados
em execução. Os [testes da API](tests.md) registram como verificar a aplicação.
