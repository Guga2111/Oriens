# Testes da API

Use JUnit 5. Os [comandos de execução](../../guides/setup.md#api) partem do Maven Wrapper.

## Testes

| Tipo | Onde | Quando |
|---|---|---|
| Unitário de serviço (Mockito) | `src/test/.../service` | Regra de domínio isolada |
| Repositório | `src/test/.../repository` | Consulta JPQL nova |
| Integração Postgres | `src/test/.../work/*PostgresTest`, via `scripts/postgres-tests.sh` | Contrato HTTP, posse (IDOR), concorrência, N+1, migrações |

Regras:
- Teste de IDOR com dois usuários para todo endpoint novo ([autorização](security.md#teste-obrigatório)).
- Teste de contagem de consultas para toda listagem nova ([consultas](persistence.md#como-verificar)).
- Teste de conflito de versão para toda escrita nova com `@Version`.
- Testes dependentes de ambiente usam `@EnabledIfEnvironmentVariable` e documentam a variável.
- `Clock` fixo nos testes que dependem de data.
- Nomes de teste descrevem comportamento: `otherUserCannotReadTaskById`, não `test1`.
