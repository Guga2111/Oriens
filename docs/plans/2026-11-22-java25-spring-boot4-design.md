# Java 25 e Spring Boot 4 — desenho aprovado

Data: 2026-11-22 · Branch: `ci/security-checks`

## Aprovação e objetivo

O usuário aprovou migrar o projeto para Java 25 e a versão estável mais recente do Spring Boot 4,
alinhando dependências, integrações, testes, Docker, CI e documentação. A implementação foi
autorizada após a apresentação do desenho. Esta entrega sucede os commits de CI da tarefa #65 e
fica em commits separados, na mesma branch, antes de qualquer merge ou publicação.

Versão alvo confirmada no Maven Central e no site oficial em 2026-11-22: **Spring Boot 4.2.0**.
Somente releases estáveis; não adotar preview do Java ou milestones/RCs de bibliotecas.

## Alternativas e decisão

| Abordagem | Benefício | Custo e decisão |
|---|---|---|
| Migrar à stack nativa do Boot 4, com Jackson 3 e integrações compatíveis | Alinha o projeto ao alvo pedido sem ponte geral para stack antiga | Exige adaptar APIs e comprovar compatibilidade; **aprovada** |
| Boot 4 com ponte temporária geral Jackson 2 | Menos mudanças imediatas | Adia parte da migração e mantém duplicidade de configuração; descartada |

## Invariantes

- Preservar rotas, JSON público, mensagens pt-BR, regras de posse/404, escopos MCP e autenticação.
- Manter o contrato das ferramentas MCP, idempotência, versões e validação estrita das entradas.
- Não invalidar autorizações OAuth persistidas nem recibos de idempotência existentes. Provar leitura
  de fixtures legadas sintéticas, sem copiar credenciais ou dados reais do banco.
- Manter schema, migrações Flyway já aplicadas e `ddl-auto=validate`; não há mudança de domínio.
- Não desabilitar segurança ou testes para contornar incompatibilidades.
- Preservar a alteração local preexistente em `.mcp.json`, fora dos commits desta entrega.

## Escopo técnico

1. **Maven e dependências:** parent Boot 4.2.0 e release Java 25. Usar versões gerenciadas pelo BOM
   quando disponíveis, incluindo Lombok e ferramentas de teste. Substituir starters e pacotes
   removidos/modularizados do Boot 4. Atualizar integrações não gerenciadas apenas quando necessário.
2. **MCP:** substituir a integração Spring antiga do SDK pelos módulos mantidos em Spring AI,
   compatíveis com Boot 4; alinhar o núcleo e o binding Jackson 3. Conservar a configuração explícita
   do servidor, OAuth delegado, catálogos e transporte stateless existentes.
3. **JSON e persistência:** migrar para os tipos/APIs Jackson 3, preservando anotações que continuam
   no namespace `com.fasterxml.jackson.annotation`. Ajustar construção imutável de mappers,
   módulos Security/OAuth e JSON do Hibernate. Testar formatos legados, datas e hashes de recibos.
4. **Segurança e observabilidade:** adaptar APIs Spring Security/Authorization Server e os pacotes
   dos endpoints de gerenciamento; preservar a separação das portas e a coleta Prometheus.
5. **Testes:** migrar anotações/pacotes Boot removidos e mocks para a API mantida; executar suíte H2
   e todas as classes PostgreSQL contra container descartável com Flyway.
6. **Execução e operação:** alinhar Docker build/runtime e todos os jobs Java do CI, inclusive auditoria
   e CodeQL. Validar a imagem e os caminhos de testes/deploy sem publicar em produção.
7. **Documentação:** atualizar guias ativos e registrar evidência nova. Evidências históricas Java 17
   continuam descrevendo o ambiente em que foram executadas; não reescrever resultados antigos.

## Sequência de implementação

1. Commitar este plano aprovado.
2. Resolver dependências estáveis e compilar com JDK 25, tratando incompatibilidades na camada dona.
3. Adaptar testes e acrescentar regressões para compatibilidade de JSON/estado OAuth/idempotência.
4. Executar H2 e PostgreSQL descartável; corrigir regressões observadas, sem ampliar regras de negócio.
5. Alinhar Docker/CI/documentação, construir a imagem e executar as verificações apropriadas.
6. Reexecutar os checks de segurança afetados, registrar resultados e commitar a migração/evidências.

## Provas e aceite

- Maven compila bytecode Java 25; runtime e CI usam JDK/JRE 25.
- Testes H2 e PostgreSQL aprovados, com segurança habilitada e migrações reais.
- Fixtures OAuth/JSON/recibos da stack anterior continuam legíveis e semanticamente equivalentes.
- API/MCP conservam contrato, posse, códigos de erro e proteção de escritas.
- Imagem Docker construída e inicialização/health comprovada com banco descartável.
- Checks CI e configuração CodeQL continuam válidos; execução remota requer push/PR posterior.
- Auditorias podem reprovar por dívida existente: registrar resultados, sem supressão automática.

## Riscos e rollback

Boot 4 altera Jackson, Hibernate, Security e a modularização de auto-configurações/testes. A troca
de bibliotecas não autoriza mudança silenciosa de JSON público ou dados persistidos. Se um formato
legado exigir compatibilidade específica, implementá-la na fronteira de persistência correspondente,
sem manter a aplicação inteira sobre Jackson 2.

Rollback é reverter os commits da migração e voltar à imagem anterior. Não alterar schema nesta
entrega. Caso seja identificada necessidade de migração de dados ou de contrato público, preparar
uma decisão concreta antes de aplicá-la. Nenhum deploy ou merge está autorizado por este plano.

## Referências

- [Spring Boot estável](https://spring.io/projects/spring-boot/)
- [Requisitos do Boot 4.2](https://docs.spring.io/spring-boot/system-requirements.html)
- [Guia de migração Boot 4](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [SDK MCP e módulos Jackson/Spring](https://github.com/modelcontextprotocol/java-sdk)
- [Migração MCP](https://github.com/modelcontextprotocol/java-sdk/blob/main/MIGRATION-1.0.md)
- [Lombok e suporte JDK](https://projectlombok.org/changelog)
