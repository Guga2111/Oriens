# AGENTS.md — Oriens

Guia de entrada para agentes de código (Claude Code, Codex, Cursor etc.) e para pessoas novas no projeto.
Leia este arquivo inteiro antes de editar código. Os detalhes estão nos guias abaixo, que são
**obrigatórios** para quem toca na camada correspondente:

| Guia | Quando ler |
|---|---|
| [docs/conventions/backend.md](docs/conventions/backend.md) | Qualquer mudança em `oriens-api/` (Java, SQL, migrações, MCP) |
| [docs/conventions/frontend.md](docs/conventions/frontend.md) | Qualquer mudança em `oriens-front/` (React, Tailwind, shadcn) |
| [docs/conventions/clean-code.md](docs/conventions/clean-code.md) | Sempre: nomes, funções, erros, testes, commits, revisão |

## 1. O que é o Oriens

Gestão pessoal de tarefas, projetos (kanban com objetivos), hábitos, estatísticas e finanças, com
integração MCP para clientes como Claude e Codex. Monorepo com duas aplicações:

```
oriens-api/     Spring Boot 4.2 · Java 25 · JPA/Hibernate · PostgreSQL 15 · Spring Security (JWT) · MCP
  src/main/java/com/oriens/oriens_api/
    controller/   HTTP: autenticação → dono → serviço → resposta (sem regra de negócio)
    service/      Regras de domínio e transações
    repository/   Spring Data JPA (consultas sempre escopadas por dono)
    entity/       Entidades JPA + dto/ (records de entrada/saída) + enums/
    security/     JWT, filtros, WorkOwner (resolve o dono autenticado)
    mcp/          Servidor MCP, OAuth delegado, escopos, catálogos de ferramentas
    resources/db/migration/postgresql/  Migrações Flyway (V<n>__descricao.sql), aplicadas no startup
  ops/            Scripts operacionais (testes PostgreSQL descartáveis, backup/restore, provas MCP)
oriens-front/   Vite · React 18 · TypeScript · Tailwind 3 · shadcn/ui (Radix) · TanStack Query · RHF + Zod
  src/
    components/ui/   Componentes shadcn (gerados pelo CLI; base de toda a UI)
    components/<domínio>/  Componentes de produto (tasks, projects, financial, statistics…)
    pages/  hooks/  services/  lib/  types/  context/  router/
docs/
  conventions/  Padrões e antipadrões (este conjunto de guias)
  plans/        Specs, designs aprovados e evidências por entrega (datados)
  specs/        Specs maiores (ex.: oriens-frontend-refactor.md)
  mcp.md        Guia do MCP
```

## 2. Comandos

```sh
# Backend (a partir de oriens-api/)
./mvnw test                         # testes (H2); *PostgresTest exigem variáveis de ambiente próprias
# Sem Postgres de prova, McpP2/P3/P4PostgresTest falham (dívida conhecida). Para a suíte local:
./mvnw test '-Dtest=!McpP2PostgresTest,!McpP3PostgresTest,!McpP4PostgresTest' -Dsurefire.failIfNoSpecifiedTests=false
ops/postgres-tests.sh [Classe…]     # *PostgresTest em PostgreSQL descartável (Docker); Flyway cria o schema
# O CI (.github/workflows/checks.yml) roda as duas suítes e o lint/testes/build do front em todo PR para dev/main.
docker compose -f docker-compose.dev.yml up -d   # API + Postgres locais (JWT_SECRET obrigatório)

# Frontend (a partir de oriens-front/)
npm run dev        # Vite em http://127.0.0.1:5173
npm run lint       # ESLint, que bloqueia HTML cru e cores fora de token (regras 6 e 7)
npm test           # Vitest + Testing Library
npm run test:e2e   # Playwright
npm run build      # build de produção (também valida tipos de import)
```

## 3. Regras inegociáveis

Estas regras valem acima de conveniência, prazo ou "só um ajuste rápido". Violação bloqueia o PR.

**Segurança e dados**
1. **Todo acesso a recurso é escopado pelo dono autenticado.** O `userId`/`id` que vem na URL ou no corpo
   nunca é prova de posse. Use `WorkOwner.id(auth)` / `WorkOwner.matching(auth, userId)` e consultas
   `findByIdAndUserId`, `lockOwned(id, ownerId)` etc. Recurso de outro usuário responde **404**, nunca 403
   (não revelamos existência). Detalhes em [backend.md §2](docs/conventions/backend.md#2-autorização-e-idor).
2. **Nada de N+1.** Listas são projetadas em lote (uma consulta por tipo de vínculo, via `findAllById`,
   `...In(ids)` ou `join fetch`). Nunca chame repositório dentro de `stream().map()`/laço sobre entidades.
3. **Nunca exponha entidade JPA na API.** Responda com records/DTOs (`WorkResponses`, `TaskView` etc.).
4. **Nunca altere schema pelo Hibernate.** `ddl-auto=validate`. Mudança de banco = nova migração Flyway
   aditiva em `oriens-api/src/main/resources/db/migration/postgresql/`; nunca edite uma migração já aplicada.
5. **Nunca commite segredos** (`.env`, tokens, chaves, salts). Use `.env.example` para documentar variáveis.

**Frontend**
6. **Nada de primitivos HTML interativos crus** (`<button>`, `<input>`, `<select>`, `<textarea>`, `<table>`,
   `<dialog>`, `<a>` de navegação interna…). Use o componente shadcn equivalente em `@/components/ui`.
   Se não existir, adicione-o pelo CLI do shadcn; blocos da comunidade em **shadcn.io** podem ser
   consultados (ver regras de licença e dependências em [frontend.md §2](docs/conventions/frontend.md#2-shadcn-primeiro)).
7. **Só tokens de design.** Cores, raios e espaçamentos vêm de tokens (`bg-primary`, `text-muted-foreground`,
   `border-border`, `rounded-lg`, escala de espaçamento do Tailwind). Proibido hex/rgb/hsl literal,
   paleta crua do Tailwind (`bg-blue-500`) e `style={{…}}` para estilo estático.

**Processo**
8. **Mudança de comportamento vem com teste.** Bug corrigido ganha teste que falhava antes.
9. **Escopo mínimo coerente.** Não refatore o que não foi pedido, não adicione abstrações especulativas,
   não "melhore" arquivos vizinhos no mesmo PR. Registre a dívida e siga.
10. **Pergunte antes de decisões difíceis de reverter**: schema, contrato público da API/MCP, auth,
    remoção de dados, novas dependências, mudanças de identidade visual.

## 4. Como trabalhar neste repositório

1. **Leia antes de escrever.** Procure o padrão existente (ex.: `WorkReadService.views` para projeção em lote,
   `useWork.ts` para queries) e estenda-o. Não crie um segundo jeito de fazer a mesma coisa.
2. **Entregas grandes têm spec.** Funcionalidades novas seguem o fluxo `docs/plans/AAAA-MM-DD-<tema>-design.md`
   → aprovação → implementação → evidência. Não implemente spec ainda não aprovada.
3. **Prove com o menor teste suficiente** e reporte o que rodou e o que não rodou.
4. **Commits** em Conventional Commits, em inglês, no imperativo:
   `feat(projects): …`, `fix(mcp): …`, `refactor(layout): …`, `docs: …`, `test: …`.
5. **Idioma.** Código, identificadores e commits em inglês. Textos de UI, mensagens de erro ao usuário e
   documentação em português (pt-BR).

## 5. Definição de pronto (checklist do PR)

- [ ] Toda consulta nova filtra pelo dono; teste cobre acesso de outro usuário (espera 404).
- [ ] Nenhuma consulta dentro de laço; listas usam carregamento em lote.
- [ ] Escritas concorrentes usam versão (`If-Match`/`@Version`) ou lock explícito, conforme o padrão do domínio.
- [ ] Nenhuma entidade JPA serializada na resposta.
- [ ] Nenhum primitivo HTML interativo cru; nenhuma cor/medida fora de token.
- [ ] Estados de carregando, vazio e erro tratados; acessível por teclado; rótulos e `aria-*` corretos.
- [ ] `npm run lint`, `npm test` e/ou `./mvnw test` passando — ou o motivo de não rodar está no PR.
- [ ] Sem código morto, `console.log`, `System.out.println`, TODO sem dono ou arquivo comentado.

## 6. Dívida conhecida

Código legado anterior aos padrões acima ainda existe. **Não copie esses padrões**; ao tocar nesses
arquivos para outra tarefa, não amplie o problema. A lista viva está em
[backend.md §11](docs/conventions/backend.md#11-dívida-conhecida) e
[frontend.md §10](docs/conventions/frontend.md#10-dívida-conhecida).
