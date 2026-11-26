# Setup e verificação local

Use Make, Java 25, Docker com Compose, Node 22, npm e Python 3 para as rotinas
documentais e operacionais. As aplicações mantêm seus manifests e lockfiles.

Na raiz, `make help` lista os atalhos. `make test` combina a suíte Maven
com H2 e a suíte Vitest. Use `make test-postgres` para a suíte isolada,
`make lint` para ESLint, `make build` para gerar o JAR e a SPA, e `make e2e`
com Chromium instalado e a API de teste iniciada. Os comandos abaixo descrevem
cada aplicação. Consulte o [pre-commit local](pre-commit.md) para verificações
rápidas por commit e o [ADR de layout](../decisions/006-monorepo.md) para a
organização do repositório.

## Ambiente local

Na raiz do repositório, use [.env.example](../../.env.example) como modelo para
`.env` e configure `JWT_SECRET` com pelo menos 64 bytes. O Compose local
publica API em `127.0.0.1:8080` e PostgreSQL em `5432`.

```sh
docker compose -f ops/compose/docker-compose.dev.yml config -q
docker compose -f ops/compose/docker-compose.dev.yml up -d
```

Para habilitar a integração, siga a [configuração local do MCP](mcp-operations.md#habilitar-no-docker-local).

Ao criar a conta de demonstração, o perfil `dev` sem `prod` prepara a tarefa
**Explorar o editor de descrição** em **Hoje** e no projeto **Lançamento do
portfólio**. A descrição inclui um diagrama Mermaid e uma tabela. A criação
das amostras ocorre só na inicialização da conta de demonstração.

## API

Em `apps/api/`, use o Maven Wrapper.

```sh
./mvnw -B test '-Dtest=!McpP2PostgresTest,!McpP3PostgresTest,!McpP4PostgresTest' -Dsurefire.failIfNoSpecifiedTests=false
```

Essa execução usa H2. As três classes MCP excluídas precisam de PostgreSQL
descartável. Na raiz, rode o script para as suítes PostgreSQL ou passe as
classes relevantes como argumentos. O Flyway aplica o schema na inicialização.

```sh
scripts/postgres-tests.sh
scripts/postgres-tests.sh WorkApiPostgresTest
```

Leia os [padrões de testes da API](../conventions/backend/tests.md).

## Cliente

Execute os comandos em `apps/client/`.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Abra o Vite em `http://localhost:5173`, origem aceita pelo CORS da API.
Mantenha a API local em execução
durante os testes E2E.

```sh
npx playwright install chromium
npm run test:e2e
```

O Playwright cria conta sintética e usa `http://localhost:8080` por padrão,
configurável com `E2E_API_BASE_URL` para outro ambiente de teste.
Leia os [padrões de testes do cliente](../conventions/frontend/tests.md).
