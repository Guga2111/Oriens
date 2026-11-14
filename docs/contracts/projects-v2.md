# Contratos P0 de Projetos

Contrato da próxima versão: **escritas/segurança implementadas em P2; leituras agregadas pendentes em P3; sem liberação em produção**. Fonte de produto:
[SPEC](../plans/2026-11-13-projects-refactor-spec.md), seções 4–11.
[Tipos de transporte](projects-v2.ts) fixam os DTOs; não importar entidades JPA no transporte.
P1 implementa persistência; P2 implementa escritas/segurança; P3 implementa leituras.
P0 não troca contratos em produção nem simula compatibilidade com clientes antigos.

## Representação e validação

IDs são inteiros positivos estáveis, gerados pelo servidor, nunca índices de listas.
Versões são inteiros não negativos. O frontend rejeita IDs/versões fora de `Number.isSafeInteger`;
o backend não aceita números fracionários. Datas são strings de calendário reais `YYYY-MM-DD`,
horas `HH:mm:ss` entre 00:00:00 e 23:59:59; timestamps técnicos são instantes ISO com `Z`.
Não usar `toISOString()` para datas. Parsing estrito rejeita 29/02 em ano não bissexto.
`America/Recife` é o único fuso; backend terá `Clock` injetável e frontend calcula hoje/agora nessa zona.

Objetivos têm apenas PENDING/CONCLUDED. Tarefas e colunas usam
PENDING/ON_DOING/CONCLUDED/CANCELLED; nomes livres de coluna não mudam significado.
Prioridade omitida na criação é MEDIUM. Título após trim: 1–200 caracteres;
nome de coluna: 1–60, único por projeto após trim e sem distinguir caixa;
descrição: até 10.000. Texto sem interpretação como HTML.

Em PATCH, campo omitido preserva o valor; `null` limpa apenas campos anuláveis.
Campo obrigatório não aceita `null`. `plannedDate:null` limpa também `startTime`;
`projectId:null` limpa objetivo/coluna/posição e preserva estado. Payload que simultaneamente
retira planejamento e fornece horário não nulo é inválido (422), não perde silenciosamente horário.
PATCH não recebe `userId`, `completedAt`, `createdAt`, `position`, `mode` ou coleções inteiras.
Campos desconhecidos são rejeitados. `beforeTaskId:null`/omitido significa final ao mover;
edição sem mudança de coluna/ordem preserva posição. `location` é substituição do objeto completo,
com os mesmos campos atuais; `null` remove localização. Validações de localização atuais permanecem.

Em leituras, ausências anuláveis aparecem como `null`, coleções vazias como `[]`.
Objetivos completos aparecem só no detalhe. Sidebar não carrega quadro nem objetivos.
Task projeta projeto/objetivo/coluna autorizados; flags internas de envio não são editáveis nem
expostas. SIMPLE tem contagens de tarefas `null`; DEVELOPMENT vazio tem zeros reais.
`nonCancelledTasks = totalTasks - cancelledTasks`, inclui concluídas. Não há percentual global
de alcance em desenvolvimento. Board informa totais antes dos filtros e contagens visíveis após
todos os filtros; colunas vazias permanecem. Paginação: `Page<T>`, página inicial 0, size 20,
máximo 100; filtros inválidos retornam 400, não são ignorados.

## HTTP

Todos os recursos são escopados pelo principal, inclusive ADMIN e `userId` da URL.
Inexistente ou alheio retorna 404. Toda escrita é transacional e responde após commit.
GET individual e escrita de recurso versionado retornam `ETag: "<version>"`.
No envelope de tarefa, ETag é a versão de `task`; no objetivo é a de `objective`;
em configuração de quadro é a versão de Project. GET board também usa projectVersion.
Listas agregadas não usam ETag de um recurso arbitrário.

| Operação | Corpo / parâmetros | Sucesso |
| --- | --- | --- |
| POST `/project/user/{userId}` | CreateProject | 201 ProjectDetail |
| GET `/project/user/{userId}` e `/all` | paginação/filtros existentes preservados | 200 Page<Project> |
| GET `/project/user/{userId}/sidebar` | escopo do principal | 200 SidebarProject[] |
| GET `/project/{id}` | ID | 200 ProjectDetail |
| PATCH `/project/{id}` | PatchProject | 200 ProjectDetail |
| PATCH `/project/{id}/mode` | ConvertProject | 200 ProjectDetail |
| PATCH `/project/{id}/favorite` | FavoriteProject | 200 ProjectDetail |
| PATCH `/project/{id}/archive` | ArchiveProject | 200 ProjectDetail |
| POST `/project/{id}/objectives` | CreateObjective | 201 ObjectiveMutation |
| PATCH `/project/{id}/objectives/{objectiveId}` | PatchObjective | 200 ObjectiveMutation |
| DELETE `/project/{id}/objectives/{objectiveId}` | If-Match do objetivo; X-Project-Version do projeto | 200 ObjectiveDeletion |
| GET `/project/{id}/board` | BoardFilters combináveis | 200 Board |
| POST `/project/{id}/columns` | CreateColumn | 201 BoardConfigMutation |
| PATCH `/project/{id}/columns/{columnId}` | PatchColumn | 200 BoardConfigMutation |
| PUT `/project/{id}/columns/order` | OrderColumns: lista completa, sem duplicação | 200 BoardConfigMutation |
| PATCH `/project/{id}/board-defaults` | BoardDefaults | 200 BoardConfigMutation |
| POST `/project/{id}/columns/{columnId}/remove` | RemoveColumn | 200 ColumnRemoval |
| GET `/task/{id}` | ID | 200 Task |
| POST `/task/user/{userId}` | CreateTask | 201 TaskMutation |
| PATCH `/task/{id}` | PatchTask | 200 TaskMutation |
| DELETE `/task/{id}` | If-Match da tarefa; X-Project-Version se vinculada | 200 TaskDeletion |
| GET `/task/user/{userId}` | date obrigatório | 200 Day |
| GET `/task/user/{userId}/range` | startDate/endDate inclusivos, obrigatórios | 200 Range |
| GET `/task/user/{userId}/all` | TaskFilters; intervalo exige dateField | 200 Page<Task> |
| GET `/task/user/{userId}/planning-count` | date; excludeTaskId opcional autorizado | 200 PlanningCount |
| GET `/project/{id}/deletion-preview` | ID | 200 DeletionPreview |
| DELETE `/project/{id}` | If-Match do preview | 204, tarefas sobrevivem |

Rotas de upload e leitores de estatísticas/resumo semanal permanecem, com autorização e adaptação
das datas em P2/P3. Esta tabela não cria rotas duplicadas para objetivos ou tarefas de quadro.

Toda criação de entidade (projeto/tarefa/objetivo/coluna) exige `Idempotency-Key` UUID;
POST de remoção de coluna é comando versionado, não criação. Modo deve vir explicitamente;
não inferir SIMPLE para o POST antigo. Escritas de estado são por estado desejado, nunca toggles.
PUT integral de tarefa/projeto, rotas singulares por índice e toggles antigos retornam 410
antes de tocar dados. A única nova rota PUT de projeto é a ordem completa das colunas.

Versão em corpo conforme tipos; DELETE usa If-Match forte, sem `*` nem lista de ETags.
Se um cliente enviar também If-Match em PATCH, deve concordar com a versão do corpo (400 se divergir).
Ausência de precondição obrigatória é 428; sintaxe inválida 400; versão divergente do banco 409.
`projectVersion` é obrigatória para criar vinculada e alterar/remover tarefa já vinculada.
Transferência exige origem em projectVersion e destino em targetProjectVersion;
vincular avulsa exige apenas targetProjectVersion. Remoções de objetivo/tarefa usam
`X-Project-Version` para carregar a precondição estrutural sem corpo em DELETE.
Criação de objetivo acrescenta projectVersion ao corpo da SPEC: inclusão muda o agregado e não pode
aceitar formulário estrutural obsoleto. São precisões do mecanismo da seção 9, sem nova função de produto.

PATCH de objetivo só de conteúdo/estado usa sua versão e não muda a versão estrutural do projeto.
Inclusões/exclusões, mudança de coluna/pertencimento, metadados, padrões e ciclo de vida incrementam
Project. Retornar/reconsultar a nova versão antes da próxima ação. Locks de projeto em ID crescente,
depois lock/releitura da tarefa. Validar propriedade e versões depois dos locks. JPA `@Version`
em Project, Objective, ProjectColumn e Task; incremento forçado nos filhos estruturais.

## Idempotência e respostas ambíguas

Recibo único por `(userId,operation,idempotencyKey)`, com hash SHA-256 de payload canônico validado
(campos ordenados recursivamente; omissões/defaults normalizados; null e ausência significativos em PATCH).
`operation` inclui recurso pai, por exemplo `project:42:objective:create`; não apenas nome de controller.
Recibo, recurso e versão estrutural confirmam na mesma transação. Guardar status/corpo original
e versão para devolver o mesmo resultado após resposta perdida; reautorizar e verificar existência
antes de devolver. Recurso apagado: 410; hash diferente: 409, sem segunda criação.
Repetição deve consultar recibo antes de rejeitar projectVersion que a própria criação incrementou.
No conflito de chave simultânea, reler recibo após rollback/retry transacional limitado, sem repetir
efeitos fora do banco. Não guardar tokens, entidades User ou dados de autenticação no recibo.

TTL de replay: 24 horas; persistir `expiresAt >= createdAt + 24 h`. P2 limpa o corpo de resposta expirado em job horário e mantém marca mínima da chave
para impedir recriação por retry incerto depois da limpeza. Não há retry automático
de criação incerta após essa janela. Recibo expirado ainda
presente retorna 410. Cliente mantém a mesma chave/payload até resolver a tentativa; nova chave
somente para nova intenção explícita. P0 fixa a tabela, não inicia job de limpeza.

## Erros

Todas as respostas de erro seguem ErrorResponse, sem stack trace nem dados alheios.
`requestId` é gerado no servidor e correlacionado com logs; conflito só inclui currentVersion após
autorizar o recurso. `fieldErrors` sempre é array, inclusive vazio.

| Status | code |
| --- | --- |
| 400 | INVALID_REQUEST |
| 401 | UNAUTHENTICATED |
| 404 | NOT_FOUND |
| 422 | DOMAIN_VIOLATION |
| 409 | VERSION_CONFLICT ou IDEMPOTENCY_CONFLICT |
| 428 | PRECONDITION_REQUIRED |
| 410 | CLIENT_UPGRADE_REQUIRED ou RESOURCE_GONE |
| 500 | INTERNAL_ERROR |

Backend é dono de estado, completedAt e invariantes. Concluir novamente não muda completedAt;
editar título/prazo nunca conclui. Planejamento após prazo é aviso salvável. Hoje segue a partição
exclusiva da SPEC §5; outros dias têm previousPlans/deadlineAttention vazios. Semana usa domingo–sábado,
sempre com intervalo explícito. Nenhuma leitura altera planejamento, nem materializa tarefa duplicada.
