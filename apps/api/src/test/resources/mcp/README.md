# Fixtures de compatibilidade Java 17 / Boot 3

Dados inteiramente sintéticos, gerados com Temurin 17, Jackson 2.19.2, Spring Security 6.5.5 e
Authorization Server 1.5.2, versões da stack Boot 3.5.6 anterior à migração.

- `oauth-authorization-boot3.json`: formato de `McpAuthorizations.Data`, com atributos obtidos de
  `OAuth2Authorization.getAttributes()` e metadados de `getAccessToken().getMetadata()`, usando
  `SecurityJackson2Modules` e `OAuth2AuthorizationServerJackson2Module`. Inclui wrappers imutáveis
  reais do JDK, principal autenticado, pedido PKCE e claims de token. A camada de criptografia é
  simulada no teste; não há chave ou credencial real nesta fixture.
- `creation-task-boot3.json`: payload normalizado de tarefa e SHA-256 do JSON ordenado produzido
  por Jackson 2, com datas/horários ISO, campos nulos e título Unicode. Prova que retries de recibos
  antigos continuam retornando a resposta existente sem criar novamente o recurso.

Não regenerar essas fixtures com Jackson 3: isso removeria a prova de compatibilidade histórica.
