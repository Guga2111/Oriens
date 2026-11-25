# Autorização e segurança da API

As rotas HTTP e as ferramentas MCP precisam provar a posse no banco.

## Autorização e IDOR

**IDOR** (Insecure Direct Object Reference): o cliente troca um ID na URL/corpo e lê ou altera dados de
outra pessoa. Estar autenticado **não** é estar autorizado. No Oriens, todo dado de domínio pertence a um
usuário, então **toda leitura e escrita precisa provar posse no banco**.

### Regras

1. **O dono vem do token, nunca do cliente.** Obtenha-o com `WorkOwner.id(auth)`.
2. **Rotas com `{userId}`** usam `WorkOwner.matching(auth, userId)`, que falha se o `userId` da URL não for
   o do token. Rotas novas devem preferir **não** ter `userId` na URL (o dono já está no token).
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
8. **MCP** adiciona escopos: toda ferramenta checa o escopo exigido (`McpScopes`/`McpAuthorizations`)
   **além** da posse. Escopo nunca substitui o filtro por dono.

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

❌ **Antipadrão** — confiar no ID da URL (exemplo histórico, corrigido no `NotificationController`):

```java
@PostMapping("/{notificationId}/read")
public ResponseEntity<Void> markAsRead(@PathVariable Long notificationId) {
    notificationService.markAsRead(notificationId);   // qualquer usuário marca a notificação de qualquer outro
    ...
}

@GetMapping("/user/{userId}")
public List<Notification> list(@PathVariable Long userId) { ... } // troque o número e leia dados alheios
```

❌ **Antipadrão** — checar depois de carregar:

```java
Project p = projects.findById(id).orElseThrow();
if (!p.getUser().getId().equals(owner)) throw new AccessDeniedException(); // 403 revela existência;
// e é fácil esquecer em um dos caminhos. A posse precisa estar na consulta.
```

❌ **Antipadrão** — associar sem validar posse do ID recebido:

```java
task.setProjectId(command.projectId());   // projectId de outro usuário vira vínculo válido
```

### Consultas agregadas e em lote também filtram por dono

`count`, `sum`, `exists`, `update`/`delete` em massa e consultas de estatística recebem o dono como
parâmetro. Um `@Modifying @Query("update Notification n set n.read = true where n.user.id = :userId")`
está correto **somente** se `userId` veio de `WorkOwner`, não da URL.

Ao projetar em lote, filtre também os vínculos (ex.: `WorkReadService.views` descarta projetos de outro
dono retornados por `findAllById` e lança 404 se a tarefa não for do dono).

### Teste obrigatório

Todo endpoint novo ganha teste com **dois usuários**: o usuário B tenta ler, alterar e apagar o recurso de
A pelo ID e recebe **404**, e o recurso de A permanece intacto. Ver `WorkApiPostgresTest`.

## Segurança geral

- Rotas públicas são exceção explícita em `SecurityConfig` (`permitAll`) e revisadas em PR.
- Segredos só por variável de ambiente (`JWT_SECRET`, `ORIENS_MCP_*`); nada de default inseguro em produção.
- Senhas com `PasswordEncoder` (BCrypt); campo de senha `@JsonProperty(access = WRITE_ONLY)`.
- Upload: limite de tamanho (já 2 MB), lista permitida de tipo/extensão, nome gerado pelo servidor,
  caminho normalizado (sem `..`), e posse do recurso ao qual o arquivo se vincula.
- CORS: lista explícita de origens confiáveis (`CorsConfig`), nunca `*` com credenciais.
- Limites de tamanho e taxa nas entradas abertas (OAuth/MCP já têm `McpRateLimiter` e
  `max-http-form-post-size`).
- Não registre em log JSON controlado por atacante (por isso `logging.level.io.modelcontextprotocol=OFF`).
