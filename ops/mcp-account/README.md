# MCP da conta — entregas P0 a P4

> Registro histórico. Para operação atual, consulte [configuração e operação do MCP](../../docs/guides/mcp-operations.md).
> Os scripts de migração, os selos e as suítes Java 17 abaixo foram substituídos pelo Flyway
> e por `scripts/postgres-tests.sh`.

Contrato: [spec histórica](../../docs/plans/2026-11-16-mcp-account-spec.md).
Evidências [P0/P1](../../docs/plans/2026-11-16-mcp-p0-p1-evidence.md),
[P2](../../docs/plans/2026-11-16-mcp-p2-evidence.md),
[P3](../../docs/plans/2026-11-16-mcp-p3-evidence.md) e
[P4](../../docs/plans/2026-11-16-mcp-p4-evidence.md).

## P2 — projetos, objetivos e tarefas

A revisão `oriens-mcp-work-v1` sucede `oriens-mcp-account-v1`. Aplicar P0/P1 antes
dela, em alvo explicitamente identificado e com o mesmo procedimento de backup,
parada de escritores e restore isolado. O único DDL amplia o CHECK de status dos
recibos para 200/201. Não cria outro ledger, não modifica recibos antigos nem
reprocessa recursos. Arquivos e checksums históricos permanecem intactos.

```sh
python3 oriens-api/ops/mcp-account/work.py \
  --host HOST_EXPLICITO --port PORTA --database BANCO_EXATO --user OPERADOR
```

Depois da P2, verificar o selo com `work.py`; o migrador P0/P1 recusa uma revisão
posterior por segurança. Repetir a evolução verifica o catálogo sem reaplicar DDL.
Drift, checksum diferente, revisão desconhecida ou erro revertem a transação.
Rollback de aplicação mantém o schema aditivo: não estreitar o CHECK enquanto
existirem recibos 200 e não apagar tombstones. Desabilitar MCP antes de retornar
a código anterior; os recibos REST 201 e os seus hashes continuam compatíveis.

O catálogo tem 17 ferramentas, sempre filtradas pelos escopos efetivos:

- Contexto: `oriens_get_context`.
- Projetos: `oriens_list_projects`, `oriens_get_project`, `oriens_create_project`,
  `oriens_update_project`, `oriens_set_project_archived`, `oriens_delete_project`.
- Objetivos/quadro: `oriens_create_objective`, `oriens_update_objective`,
  `oriens_delete_objective`, `oriens_get_board`.
- Tarefas: `oriens_list_tasks`, `oriens_get_task`, `oriens_create_task`,
  `oriens_update_task`, `oriens_move_task`, `oriens_delete_task`.

São 16 ferramentas de domínio e o contexto. IDs são strings
decimais positivas; versões inteiras não negativas; chave UUID por intenção de
escrita. Preservar chave, payload e versões ao repetir após timeout. Não gerar
uma nova chave automaticamente em conflito ou `RESOURCE_GONE`.

Consultas e totais aplicam dono/allowlist/avulsas no SQL. Objetivos, colunas e
tarefas têm páginas independentes (20 por padrão, até 100). Sem leitura de
tarefas, projeto/objetivos/quadro omitem essas seções e contagens. Leitura não
grava acesso recente. Datas de planejamento e prazo permanecem distintas.

O SDK possui registro global de ferramentas. A SPI de transporte filtra o
resultado de descoberta por requisição, sem remover/adicionar ferramentas
globalmente. A chamada valida novamente a política dentro da transação.

Escritas passam pelo domínio canônico, com usuário → conexão → projetos por ID
→ tarefa. A confirmação, o recibo e a auditoria são atômicos. Namespace do
recibo é usuário + conexão + ferramenta + chave; REST conserva seu namespace.
Corpo expira em 24 horas e tombstone impede recriação incerta. Replay exige
permissões e recursos atuais; não devolve conteúdo de recursos excluídos.

Criar projeto retorna `requiresProjectAuthorization: true` e não muda a allowlist.
Só a confirmação dessa criação pode ser repetida sem leitura do novo projeto,
com revisão de política inalterada e recurso ainda existente. Excluir projeto
preserva tarefas como avulsas; a confirmação pode ser repetida após remoção
automática da associação, somente na mesma revisão. Decisão posterior do usuário
encerra essas exceções; renomear a conexão não muda sua autorização.

Nenhuma ferramenta financeira foi adicionada. A tela de consentimento/gestão e
a liberação de produção continuam P4. MCP permanece desligado por padrão.

## Provas reproduzíveis

```sh
# PostgreSQL próprio + runtime Java 17 real, sem atingir bancos existentes:
python3 oriens-api/ops/mcp-account/test_mcp.py --java17

# CLIs instaladas e Brave/Playwright do projeto; nenhuma inferência externa:
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --clients --browser

# P2 + P0/P1 herdadas, runtime Java 17 e PostgreSQL descartável:
python3 oriens-api/ops/mcp-account/test_mcp.py --p2 --java17

# P2 pelos dois clientes reais, credenciais temporárias e fixture local:
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --p2 --clients
```

O runner cria e remove seu container por nome/ID próprio. Fixtures são sintéticos.
A prova Java 17 usa `maven:3.9.9-eclipse-temurin-17`. As provas de clientes usam
Codex app-server e Claude Code real, com credenciais temporárias limpas ao fim;
configuração persistente do usuário não é editada. Claude usa um fixture Messages
local determinístico somente para provocar a chamada; não há modelo externo.
A prova de navegador usa duas origens loopback, cookie HttpOnly, CORS real, JWT no
header e PKCE. Arquivos de evidência em `apps/api/target/mcp-*-proof.json` não
contêm tokens, códigos, cookies ou conteúdo de domínio.

## P3 — finanças protegidas

A revisão aditiva `oriens-mcp-finance-v1` sucede `oriens-mcp-work-v1`. Publica as
sete ferramentas financeiras da SPEC (24 ferramentas ao todo, incluindo contexto),
filtradas por `finance:*` em descoberta e chamada. Projetos/tarefas não concedem
acesso financeiro. Dinheiro MCP usa strings decimais de duas casas; somas não são
limitadas ao teto de um lançamento. Resumo tem um único snapshot SQL e paginação
independente por categoria, sem limitar os totais à página.

`FinancialEntryServiceImpl.write` é a fronteira de criação, substituição, patch e
exclusão dos dois canais. Usa o mesmo ledger `creation_receipts` com namespace
REST ou conexão/ferramenta MCP. Versão é retornada em todas as leituras. O REST
exige `Idempotency-Key` UUID em POST/PUT/DELETE e `If-Match: "<versão>"` em PUT/DELETE.
O corpo POST/PUT contém somente `amount`, `entryDate`, `description`, `tagId`,
`isRecurring`, `recurrencePattern`, `recurrenceEndDate`. IDs, versão, pai e
metadados não são editáveis no corpo. Pré-condição ausente falha com 428; conflito
com 409; recibo expirado/recurso excluído com 410. Lock/timeout recuperável devolve
503 e instrui repetir a mesma chave. DELETE reconhecido continua respondendo 204.

O frontend publica junto: conserva chave, payload e versão nas falhas incertas;
bloqueia edição do pedido incerto; não sobrescreve após conflito; recarga explícita
permite descartar o rascunho e revisar a versão atual. Exclusão mantém a confirmação
aberta em falha. A edição da origem recorrente oferece data final para encerrá-la.
Não publicar somente a API esperando que um frontend antigo continue escrevendo.

Ordem: usuário (`FOR NO KEY UPDATE`) → conexão MCP → lançamento. Esse lock de
usuário ainda serializa intenções/revogação e permite o KEY SHARE da FK ao gerar
uma ocorrência. `FOR UPDATE` no usuário criaria um ciclo com o scheduler que já
segura a origem. Scheduler conserva cobertura → origens, reivindica cada data uma
vez e incrementa a versão da origem quando gera ocorrências. Ativação da
recorrência usa o campo JPA `recurrenceStartedOn`, sem UPDATE JDBC desprotegido.
Claims e histórico não são removidos; ocorrência excluída não reaparece.

Antes de aplicar em ambiente compartilhado, interromper todos os escritores
financeiros antigos (instâncias da API e scheduler). Aplicar a revisão e substituir
a API/frontend antes de reabrir escritas. Evitar uma janela com escritores que
ignorem versão em paralelo aos novos. Nenhuma dessas ações foi executada aqui.

Aplicação operacional, com alvo explícito e P2 já aplicada:

```sh
python3 oriens-api/ops/mcp-account/finance.py \
  --host <host> --port <porta> --database <banco> --user <usuario>
```

O runner valida checksum e catálogo, usa advisory lock e transação, recusa drift
e repete sem efeito. Não altera valores, calendário ou histórico. Rollback de
aplicação conserva versão, recibos e tombstones. Durante recuperação, interromper
escritores financeiros e servir somente leituras até restaurar a versão protegida
compatível da API/frontend. Não voltar a um escritor antigo que ignore versões;
não remover a coluna ou estreitar os CHECKs como atalho. Backup e rollback
operacional em ambiente compartilhado continuam sujeitos ao processo de publicação.

Provas em banco descartável (nunca conectar um banco real a esses fixtures):

```sh
python3 oriens-api/ops/mcp-account/test_mcp.py --p3 --java17
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --p3 --browser
npm --prefix oriens-front test
```

`--p3` inclui as provas P0/P1/P2, finanças e regressões canônicas de projetos,
estatísticas e recorrência. O runner limpa somente seu banco descartável entre
as suítes de relógio real e fixo. `--browser` requer dependências do frontend,
Chromium do Playwright e as scripts da skill de design para o inspector; usa
build de produção e proxy em loopback para a API descartável. A identidade de
navegador e as categorias/entradas são sintéticas. Não configura clientes pessoais.
MCP permanece desligado por padrão. A experiência e as provas P4 estão abaixo.


## P4 — experiência completa e liberação isolada

A seção Integrações preserva WhatsApp e usa os componentes/temas atuais do
Oriens. Oferece configuração pública por cliente, consentimento, retomada local
após login, lista de conexões, redução com versão, revogação e histórico paginado
por resultado. Não há migração P4, dependência nova, autoaprovação ou ativação do
flag. Outros clientes recebem requisitos para um registro próprio, sem reutilizar
os IDs dos dois clientes certificados.

GET de conexão/lista acrescenta `allowedProjects` com `id`, `title`, `archived`,
consultados por conexão e dono. `allowedProjectIds` e o contrato de escrita são
preservados. Isso evita consultas de detalhe de todos os projetos no navegador
somente para mostrar nomes autorizados. O histórico sem filtros usa um único
instante para os dois limites da janela de 90 dias.

Com MCP desabilitado, protocolo, OAuth, metadados e `/integrations/mcp/**`
respondem 404 diretamente, sem despacho para `/error`/cadeia JWT. A origem de
frontend autorizada recebe os headers CORS inclusive nesse 404; seu preflight
OPTIONS é atendido normalmente. Origens não autorizadas continuam recusadas.
Isso permite à interface mostrar “MCP não habilitado” em vez de erro de rede. O smoke real
verifica desligamento e religamento em instâncias independentes, login normal e
persistência da conexão sem alteração do schema aditivo. Não é rollback para um
escritor financeiro antigo nem prova do proxy/certificado público.

```sh
# P4 e todas as suítes herdadas com Java 17 e PostgreSQL descartável:
python3 oriens-api/ops/mcp-account/test_mcp.py --p4 --java17

# Interface de produção, dois clientes reais e API/PostgreSQL descartáveis:
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --p4 --clients --browser

# Regressões da interface:
npm --prefix oriens-front test
```

Os clientes usam o setup e o mesmo formatador da interface. O consentimento passa
pela página publicada no build React, cookie HttpOnly/CORS e JWT no header. Codex
usa app-server sem inferência; Claude recebe somente fixture Messages local para
provocar a ferramenta. Credenciais temporárias são limpas; configuração pessoal
não é editada. A prova de UI também verifica cancelamento, login real, redução,
conflito preservando rascunho, histórico, revogação que invalida token e foco de
teclado. Perfil/preferências são os únicos endpoints fora do módulo sob teste
substituídos por fixture; todas as operações MCP/domínio/login são reais.

Capturas e relatórios ficam em `oriens-front/.taste-skill/p4/` (ignorados pelo Git).
`p4_browser_proof.mjs --before` registra uma revisão anterior já montada; sem esse
argumento registra o vazio atual. `p4_live_proof.mjs` é invocado pelo runner,
que fornece explicitamente as duas origens loopback e identidades sintéticas.
Os inspectors medem Configurações e consentimento em 1440/768/390. Os relatórios
versionados em `docs/plans/2026-11-16-mcp-p4-*` conservam a evidência sanitizada.
