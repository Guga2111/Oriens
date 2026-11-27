# Estrutura da API

A API em `apps/api/` usa Spring Boot e Java com PostgreSQL.
Consulte o [catálogo de dependências](stack.md).

## Camadas e responsabilidades

| Camada | Faz | Não faz |
|---|---|---|
| `controller/` | Lê `Authentication`, resolve o dono com `WorkOwner`, valida formato de entrada, chama o serviço, monta `ResponseEntity` (ETag, status) | Regra de negócio, consultas compostas, laços sobre entidades |
| `service/` | Regras de domínio, invariantes, transações, orquestração de repositórios | Conhecer HTTP (headers, `ResponseEntity`, `HttpServletRequest`) |
| `repository/` | Consultas JPA/JPQL **escopadas por dono** | Lógica condicional de negócio |
| `entity/` | Mapeamento JPA, `@Version`, invariantes simples | Ser serializada como resposta da API |
| `entity/dto/` | `record`s imutáveis de entrada (`WorkCommands`, `Patch*`) e saída (`WorkResponses`) | Carregar entidades JPA dentro |

✅ **Padrão** — controller fino, dono resolvido uma vez (`TaskController.get`):

```java
@GetMapping("/{id}")
@Transactional(readOnly = true)
public ResponseEntity<TaskView> get(Authentication auth, @PathVariable Long id) {
    TaskView result = read.taskView(owner.id(auth), id);
    return WorkHttp.ok(result, result.version());
}
```

❌ **Antipadrões**
- Injetar a **implementação** (`private final UserServiceImpl userService`) em vez da dependência real.
  Interface só existe se houver mais de uma implementação ou necessidade concreta de fronteira; caso
  contrário, uma classe concreta `XService` basta (sem par `XService`/`XServiceImpl` vazio).
- Repositório chamado direto do controller para montar regras (filtros de posse, combinações de
  consultas). Leitura simples paginada é aceitável quando a consulta já é escopada por dono.
- Nomes totalmente qualificados no meio do código (`com.oriens.oriens_api.exception.WorkDomainException`)
  — use `import`.
- `System.out.println` para log (ver `MvcConfig`). Use SLF4J (`LoggerFactory.getLogger` ou `@Slf4j`).

## Datas e fuso horário

- O "hoje" do produto vem do `Clock` injetado (`ProductClockConfiguration`, zona `America/Recife`):
  `LocalDate.now(clock)`. Nunca `LocalDate.now()` sem `Clock` — não é testável e depende do fuso do servidor.
- Datas de calendário (`plannedDate`, `dueDate`) são `LocalDate`; instantes (`createdAt`) são `Instant`.
- Formato na API: `YYYY-MM-DD` e `HH:mm:ss`, validados por `WorkRequestBodyAdvice`.
