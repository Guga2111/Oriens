# Dívida conhecida

Consulte o registro da camada afetada para evitar repetir padrões legados.

## API

Código anterior aos padrões acima. **Não use como modelo.** Corrigir exige tarefa própria (com testes de
IDOR), porque muda contrato com o front.

| Onde | Problema | Risco |
|---|---|---|
| `exception/config/GlobalExceptionHandler` + `ErrorResponse` | Formata `Instant` com padrão sem fuso: o Jackson falha ao serializar e a exceção original vaza como erro do servlet em todos os controllers legados | Alto |
| JWT | Papel lido do *claim*: admin rebaixado mantém acesso até o token expirar; `updateUserRole` não impede remover o último admin | Médio |
| `UserController`, `NotificationController`, `SupportController` | Entidade JPA na resposta e `@RequestBody User`/`SupportTicketDTO` sem validação; `clearAll` responde 204 com corpo | Médio (vazamento / mass assignment) |
| `SupportTicketServiceImpl` | `getTicketsByStatus`/`getDashboardStats` carregam todos os chamados e contam em Java; e-mail enviado dentro da requisição; `System.err` | Médio |
| `ProjectServiceImpl` e outros `*ServiceImpl` legados | `findById` sem dono; par interface/impl sem necessidade | Médio |
| `application-*.properties` | `spring.jpa.open-in-view` não desligado em dev/prod | Médio (N+1 escondido) |
| `WorkExceptionHandler` | Código `FORBIDDEN` fora do `switch` (um `WorkDomainException("FORBIDDEN")` vira 422); o 403 de papel vem do handler de `AccessDeniedException` | Baixo |
| `McpP2/P3/P4PostgresTest` | Não usam `@EnabledIfEnvironmentVariable`: sem `MCP_JDBC_URL`, `./mvnw test` falha com 113 erros | Médio (suíte sempre vermelha) |

**Resolvido em 2026-11-16** (branch `fix/security-and-ui-conventions`): IDOR em `UserController`
(perfil, preferências, avatar, exclusão e busca por e-mail), `NotificationController` e `SupportController`,
e as ações de admin de suporte sem `@PreAuthorize`. As rotas agora passam por `WorkOwner` (404 para recurso
alheio) e por `WorkExceptionHandler`, com testes em `UserControllerOwnershipTest` e
`NotificationSupportAccessTest`. Use esses testes como modelo.

**Resolvido em 2026-11-19** (branch `fix/avatar-upload-allowlist`): upload de avatar e de imagem de projeto
passam por `ImageUploads` (só JPG/PNG/GIF/WebP, conferidos pela assinatura do conteúdo; SVG/HTML recusados
com 422), e `/profile-pictures/**` e `/projects-pictures/**` só servem essas extensões, de modo que arquivos
gravados antes da correção deixam de ser servidos. `System.out.println` removido do `MvcConfig`. Testes em
`ImageUploadsTest` e `ProfilePictureUploadTest`.


**Resolvido em 2026-11-25** (branch `fix/mcp-p3-product-date`): entre 00h e 03h UTC, quatro testes de finanças do `McpP3PostgresTest` falhavam no CI. Os testes calculavam hoje com `LocalDate.now()`, no fuso da JVM (UTC nos runners), enquanto o domínio usa o fuso do produto. Agora usam `LocalDate.now(ProductClockConfiguration.ZONE)`. Em teste que compara datas com o domínio, use o fuso do produto, nunca o da JVM.

## Cliente

Levantamento de 2026-11-16 (fora de `components/ui/`). Não copie estes padrões; ao tocar no arquivo por
outro motivo, não amplie o problema.

| Onde | Problema |
|---|---|
| `components/layout/AppSidebar.tsx` (`#ccc`), `components/projects/CreateProjectDialog.tsx` (`#808080`) | Cor padrão de dado como literal → constante nomeada em `lib/` |
| Vários (`max-w-[1120px]`, `max-w-[640px]`, `min-[1100px]:`, `min-w-[8rem]`, `xl:grid-cols-[…]`…) | Medidas arbitrárias repetidas → tokens |
| 19 usos de `style={{…}}` | Revisar quais são estáticos |
| `services/settingsService.ts`, `TaskRow`, `FinancialPage`, `SignLoginPage`, contextos | `console.error` deixado no código |
| `components/statistics/ActivityStreak.tsx` | `title=""` usado como tooltip → `Tooltip` |
| `tsconfig.app.json` | `strict: false`, `noImplicitAny: false` |
| `src/__tests__/task-labels.test.tsx`, `project-detail-a9-dialogs.test.tsx` | Instáveis sob carga (timeout de 5 s) |

**Resolvido em 2026-11-16** (branch `fix/security-and-ui-conventions`): regras de [ESLint](frontend/design-tokens.md#cores-só-tokens-semânticos); migração de
todos os `<button>`, `<input>`, `<select>`, `<label>` e `<table>` crus para shadcn (restam só as duas exceções
documentadas no [guia shadcn](frontend/components.md#quando-o-componente-não-existe)); `<a href="/terms">` → `Link`; cor padrão de tag em `DEFAULT_TAG_COLOR`; `console.error`
removido de `services/api.ts`.
