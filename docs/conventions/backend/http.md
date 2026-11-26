# Contratos HTTP e erros

Os endpoints do domínio work usam os contratos e envelopes abaixo. Consulte o
[ADR de concorrência](../../decisions/003-concorrencia.md) para a decisão sobre `If-Match`.

## Contrato HTTP, DTOs e validação

✅ **Padrão**
- Entrada: `record`s de comando (`WorkCommands.CreateTask`, `PatchTask`). PATCH distingue "campo ausente" de
  "campo nulo" (`PatchFields`).
- Saída: `record`s de visão (`TaskView`, `ProjectView`), com `version` para o próximo `If-Match`.
- JSON estrito: `WorkRequestBodyAdvice` rejeita formatos de data inválidos e entrada malformada. Controllers
  novos do domínio entram na lista `assignableTypes` dele e do `WorkExceptionHandler`.
- Paginação, ordenação e filtros validados no limite (`WorkPagination`, listas permitidas de `dateField`).
- Rotas aposentadas respondem `410 CLIENT_UPGRADE_REQUIRED` (`WorkHttp.retired()`) em vez de sumir sem aviso.
- Mudança de contrato consumido pelo front ou MCP é **aditiva**; remoção ou renome exige spec e versão.

❌ **Antipadrões**
- Retornar ou receber **entidade JPA** (`ResponseEntity<User>`, `@RequestBody User`): vaza campos internos,
  cria *mass assignment* (o cliente envia `role: "ADMIN"`), dispara *lazy loading* na serialização e acopla
  o schema ao contrato.
- `@RequestBody Map<String, Object>` com `instanceof` manual — use um `record` com Bean Validation
  (`@NotBlank`, `@Size`, `@Pattern`) e `@Valid`.
- Status HTTP inventado por controller (`new ResponseEntity<>(..., HttpStatus.NO_CONTENT)` com corpo).
- Mensagem de erro com detalhe técnico (stack, SQL, nome de classe) para o cliente.

## Erros

✅ **Padrão** — o domínio lança `WorkDomainException(code, field, message)`; o `WorkExceptionHandler` mapeia
código → status e devolve o envelope `{code, message, fieldErrors, requestId}`:

| Código | HTTP | Uso |
|---|---|---|
| `INVALID_REQUEST` | 400 | Formato, tipo, faixa, paginação |
| `UNAUTHENTICATED` | 401 | Sem sessão válida |
| `FORBIDDEN` | 403 | Autenticado, mas sem papel/escopo (nunca para posse — posse é 404) |
| `NOT_FOUND` | 404 | Não existe **ou não é do dono** |
| `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT` | 409 | Concorrência |
| `CLIENT_UPGRADE_REQUIRED`, `RESOURCE_GONE` | 410 | Rota/recurso aposentado |
| `PRECONDITION_REQUIRED` | 428 | Faltou `If-Match` |
| `RATE_LIMITED` | 429 | MCP / limites |
| demais códigos de regra | 422 | Violação de regra de negócio |

- Mensagem ao usuário em pt-BR, acionável ("Recarregue antes de salvar."). Detalhe técnico vai para log.
- `field` aponta o campo do formulário quando houver, para o front exibir no lugar certo.

❌ **Antipadrões**
- `catch (Exception e) { return null; }`, `e.printStackTrace()` ou engolir exceção.
- Criar uma exceção nova por entidade (`XNotFoundException`) para o domínio work — use o código.
- `try/catch` em controller para converter em `ResponseEntity` (como em `uploadProfileAvatar`): deixe o
  handler global tratar.
- Logar dados sensíveis (senha, token, telefone, corpo de requisição OAuth/MCP).
