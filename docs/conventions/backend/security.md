# Autorização e segurança da API

Este guia define a autenticação REST e as regras de posse para HTTP e MCP.
Consulte a [política de segurança](../../../SECURITY.md) para as demais fronteiras.

## Autorização e IDOR

Dados de domínio pertencem a uma conta. A aplicação verifica a posse no banco
em cada leitura e escrita para prevenir acesso indevido por referência a um ID (IDOR).

### Regras

1. Resolva o dono com [`WorkOwner.id(auth)`](../../../apps/api/src/main/java/com/oriens/oriens_api/security/WorkOwner.java).
   O helper usa a identidade autenticada para buscar a conta no banco.
2. **Rotas com `{userId}`** usam `WorkOwner.matching(auth, userId)` para comparar
   o ID da URL com o ID da conta resolvida. Em rotas novas, prefira derivar o dono
   da identidade autenticada e omitir `userId` da URL.
3. **Rotas com `{id}` de recurso** buscam com o dono na própria consulta:
   `findByIdAndUserId(id, owner)`, `lockOwned(id, owner)`. Nunca `findById(id)` seguido de "se o dono for
   diferente, lança".
4. **Recursos filhos** (objetivo, coluna, etiqueta, anexo) validam a cadeia inteira: o filho pertence ao
   pai, e o pai pertence ao dono. Ex.: `objectives.findById(objectiveId).filter(o -> o.getProject().getId().equals(projectId))`
   **depois** de `project(owner, projectId)`.
5. **IDs recebidos no corpo** (`projectId`, `columnId`, `labelIds`, `tagId`) também são entrada não
   confiável: valide a posse de cada um antes de associar. Lista de IDs → uma consulta `...In(ids)` com
   dono, e compare o tamanho do resultado com o tamanho da entrada.
6. **Recurso de outro usuário responde 404** (`WorkDomainException("NOT_FOUND", …)`), igual a recurso
   inexistente. Retornar 403 revela que o ID existe e permite enumeração.
7. **Papéis administrativos** usam `@PreAuthorize("hasRole('ADMIN')")` no método *e* não aceitam o papel
   vindo do corpo da requisição.
8. **MCP** exige o escopo da ferramenta e a prova de posse. A política da conexão
   também delimita o acesso a projetos e tarefas avulsas. [Contrato MCP](mcp.md)

### Exemplos

✅ **Padrão** — posse na consulta (`TaskRepository`):

```java
Optional<Task> findByIdAndUserId(Long id, Long ownerId);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select t from Task t where t.id = :id and t.user.id = :ownerId")
Optional<Task> lockOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);
```

```java
public Task task(Long owner, Long id) {
    return tasks.findByIdAndUserId(id, owner).orElseThrow(WorkReadService::missing); // 404
}
```

### Consultas agregadas e em lote também filtram por dono

`count`, `sum`, `exists`, `update`/`delete` em massa e consultas de estatística recebem o dono como
parâmetro. Um `@Modifying @Query("update Notification n set n.read = true where n.user.id = :userId")`
está correto **somente** se `userId` veio de `WorkOwner`, não da URL.

Ao projetar em lote, filtre também os vínculos (ex.: `WorkReadService.views` descarta projetos de outro
dono retornados por `findAllById` e lança 404 se a tarefa não for do dono).

### Teste obrigatório

Cubra cada operação nova com **dois usuários**. Verifique que o acesso a recurso
alheio devolve **404**, assim como um ID inexistente, e que os dados do dono
permanecem intactos após a tentativa de escrita. Use os testes de
[projetos e tarefas](../../../apps/api/src/test/java/com/oriens/oriens_api/work/WorkApiPostgresTest.java),
[conta](../../../apps/api/src/test/java/com/oriens/oriens_api/security/UserControllerOwnershipTest.java)
e [notificações e suporte](../../../apps/api/src/test/java/com/oriens/oriens_api/controller/NotificationSupportAccessTest.java).
O [ADR de posse](../../decisions/002-posse.md) registra a decisão.

## Sessão e JWT

A cadeia REST é stateless. A lista de rotas públicas está em
[`SecurityConfig`](../../../apps/api/src/main/java/com/oriens/oriens_api/security/SecurityConfig.java).
O login em `/authenticate` valida a senha com BCrypt e devolve no cabeçalho
`Authorization` um JWT HS512 com validade de 16 horas. O cliente envia o token
como `Authorization: Bearer` nas requisições seguintes.
[Verificação da senha](../../../apps/api/src/main/java/com/oriens/oriens_api/security/manager/CustomAuthManager.java) ·
[Emissão do JWT](../../../apps/api/src/main/java/com/oriens/oriens_api/security/filters/AuthenticationFilter.java) ·
[Validade](../../../apps/api/src/main/java/com/oriens/oriens_api/security/SecurityConstants.java)

O filtro verifica o JWT antes de estabelecer a identidade. Uma rota protegida
devolve 401 sem autenticação válida. A autorização por posse acontece a partir
dessa identidade. Use o [contrato MCP](mcp.md) para credenciais delegadas.
[Filtro JWT](../../../apps/api/src/main/java/com/oriens/oriens_api/security/filters/JWTAuthorizationFilter.java)

O teste `p6RegistrationLoginAndRetiredBootstrap` cobre login, senha incorreta e
rejeição de token assinado com outra chave. `JwtConfigurationTest` cobre a
configuração da chave e a invalidação do JWT assinado pela chave anterior.
[WorkApiPostgresTest](../../../apps/api/src/test/java/com/oriens/oriens_api/work/WorkApiPostgresTest.java) ·
[JwtConfigurationTest](../../../apps/api/src/test/java/com/oriens/oriens_api/security/JwtConfigurationTest.java) ·
[Gestão do segredo](../../guides/security-secrets-and-logs.md#segredos)
