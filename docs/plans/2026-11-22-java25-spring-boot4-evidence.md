# Evidência da entrega: Java 25 e Spring Boot 4.2

Desenho: [2026-11-22-java25-spring-boot4-design.md](2026-11-22-java25-spring-boot4-design.md).
Branch `ci/security-checks`, validação local em 2026-11-22 com OpenJDK 25 (build) e Temurin JRE 25.0.5
(imagem). Nada foi publicado, enviado por push ou implantado.

## 1. O que mudou

- **Build:** parent Spring Boot 4.2.0, `java.version` 25, starters modularizados do Boot 4
  (`webmvc`, `security-oauth2-authorization-server`, `flyway` e starters de teste por fatia), Lombok
  gerenciado pelo BOM. Dockerfile em `eclipse-temurin:25-jdk/jre-jammy`; jobs Java do CI em JDK 25.
- **MCP:** SDK `io.modelcontextprotocol.sdk:mcp` 2.2.0 com binding Jackson 3 e transporte stateless
  `org.springframework.ai:mcp-spring-webmvc` 2.1.0. A pré-validação de entrada do SDK
  (`validateToolInputs`) foi desligada: ela respondia antes do `McpWorkTools` com formato próprio e
  quebrava o contrato de erros (`PRECONDITION_REQUIRED`, `INVALID_REQUEST`). A validação estrita
  continua no `McpWorkTools`, coberta por `McpP2PostgresTest.closedSchemasAndConditionalPreconditionsRejectBeforeEffects`,
  que falhava antes da correção.
- **JSON:** Jackson 3 (`tools.jackson`) com `spring.jackson.use-jackson2-defaults=true`, para não mudar o
  JSON público; JSONB do Hibernate pelo `Jackson3JsonFormatMapper`. O mapper estrito das requisições
  (`WorkRequestBodyAdvice`) é reconstruído com as mesmas regras (datas, duplicatas, coerção, enums).
- **OAuth:** módulos Jackson do Security 7 com allowlist polimórfica restrita às seis coleções imutáveis
  do JDK que o Jackson 2 gravou nos metadados. CORS passa a ser um `CorsConfigurationSource`, com as
  mesmas origens, métodos e cabeçalhos.

## 2. O que rodou

| Prova | Resultado |
|---|---|
| `./mvnw test` (H2, sem McpP2–P4) em JDK 25 | 158 testes, 0 falhas (63 pulados: `*PostgresTest`) |
| `ops/postgres-tests.sh` (7 classes, PostgreSQL 15 descartável, Flyway) | Todas aprovadas após a correção MCP |
| `McpAuthorizationsCompatibilityTest` | Autorização OAuth gravada por Boot 3/Jackson 2 é lida sem perda de escopos, claims e principal; tipo polimórfico fora da allowlist é rejeitado |
| `WorkCreationCompatibilityTest` | Recibo de idempotência da stack anterior reaplica sem recriar recurso nem mudar o hash do payload |
| `docker build` + execução `prod` com MCP ligado e PostgreSQL descartável | JRE 25.0.5; 7 migrações aplicadas; inicialização em ~4,2 s; health `UP` na porta 8081 |
| Sondas HTTP na imagem | Metadados OAuth (`oauth-protected-resource`, `oauth-authorization-server`) 200; `/mcp` e `/tasks` sem token 401; Prometheus na porta de gestão e 401 na pública |
| `./mvnw -Psecurity-audit dependency-check:check` | **Reprovado** por um achado (abaixo) |

Fixtures em `oriens-api/src/test/resources/mcp/` são sintéticas; nenhuma credencial ou dado real foi
copiado.

## 3. Auditoria de dependências

Único achado ≥ 7,0: **CVE-2022-31691** (9,8) em `spring-boot-devtools-4.2.0.jar`. O CVE trata das
extensões de IDE Spring Tools 4 (Eclipse/VSCode ≤ 4.16.0 / 1.39.0); o casamento veio pelo CPE genérico
`vmware:spring_tools`, cuja faixa de versão contém 4.2.0. É falso positivo, e o devtools não entra no
jar de produção. Conforme o desenho, não foi adicionada supressão automática: decidir supressão
documentada no perfil `security-audit` ou aceitar o gate vermelho.

Abaixo do limiar: `commons-io-2.7` (CVE-2024-47554, 4,3).

## 4. O que não rodou

- Gitleaks local (binário não instalado) e análise CodeQL: rodam no CI após push/PR.
- `npm audit`/front: a entrega não toca o frontend.
- Clientes MCP reais (Codex/Claude Code) contra a imagem nova; a compatibilidade foi provada pelas suítes
  `Mcp*PostgresTest` e pelos fixtures legados.
