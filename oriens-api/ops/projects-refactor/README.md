# P0 — baseline e procedimento operacional

Implementa a P0 da [SPEC](../../../docs/plans/2026-11-13-projects-refactor-spec.md).
Não é release de P1–P6. Nenhum comando daqui é chamado por build, testes Maven,
startup, compose ou deploy. Não há reset automático.

## Inventário conferido

Em 13/11/2026, leitura **somente de schema** do container local `oriens_postgres_dev`,
PostgreSQL/pg_dump 15.19. [observed-schema.sql](observed-schema.sql) é o dump
sem registros, owners ou ACLs; removidos somente os delimitadores aleatórios `\restrict`.
Não representa validação do schema de produção: conferir o alvo no checkpoint de liberação.
Conferência com todas as classes `@Entity`/`@Embeddable` atuais:

| Entidade | Registro físico observado | Decisão na baseline |
| --- | --- | --- |
| User + UserPreferences | users; preferences achatadas em notifications/sound/theme | preservar tipos, role textual, identidade |
| PasswordResetToken | password_reset_token; password_reset_token_seq (incremento 50) | preservar sequence AUTO, token/user únicos |
| Task + Location | tasks; address/latitude/longitude achatados | preservar identidade/localização/flags; acrescentar agenda/vínculos/versão |
| Project | project (minúsculo, apesar de @Table Project) | preservar metadados; acrescentar modo/defaults/versão |
| Objective embutido | project_objectives, sem PK/ordem, status smallint e completed | nova entidade na mesma tabela física; ID/ordem/versão/status textual, sem completed |
| Tag | tags; único user_id/name, nome 50, cor 7 | preservar; FK explícita ao dono |
| FinancialEntry | financial_entry; numeric(12,2), tag FK, índices recorrência/parent | preservar; FK explícita ao dono; parent_entry_id continua escalar |
| Notification | notifications | preservar FK/datas/read/link |
| SupportTicket | support_tickets | preservar TEXT/enum prioridade e status/FK |
| Novos registros | ausentes | project_columns, creation_receipts, oriens_schema_baseline |

Nove tabelas de aplicação observadas; baseline tem onze, mais um selo operacional.
Todos os timestamps atuais sem fuso permanecem como no mapping, exceto Task.createdAt que passa
a Instant/timestamptz segundo a SPEC; Project.lastAccessed já é timestamptz.
Enums usam varchar+CHECK, sem tipos enum PostgreSQL extras nem dependência Flyway nova.
Defaults, checks, FKs e índices estão explícitos em [baseline.sql](baseline.sql).

Diferenças que P1 precisa mapear: Task.startTime anulável/time(0), Task.createdAt Instant,
Project.archived não nulo, títulos 200/descrições 10.000, modo textual, campos @Version bigint,
Objective entidade/status textual (não ordinal), ProjectColumn e recibo JSONB/UUID.
`project_objectives` mantém o nome para reduzir divergência física, não preserva dados antigos.
**Não usar esta baseline com os mappings atuais nem mudar prod para validate nesta P0.**

O banco protege dono do projeto/tarefa, pertencimento objetivo/coluna, status da coluna,
completude de vínculos, completedAt, horário/dia e exclusão RESTRICT. Serviço P1/P2,
sob transação/lock, protege DEVELOPMENT, existência/kind de padrões, quantidade mínima de colunas,
imutabilidade de kind ocupado, incrementos estruturais/ordem e conclusão idempotente.
Defaults podem ser nulos durante construção/desmontagem atômica: não criar CHECK imediato
que impeça criar o primeiro quadro ou excluir projeto após detach.

## Instalação explícita e idempotente

Requisitos: Python 3.9+ e clientes PostgreSQL 15+ (`psql`, `pg_dump`, `pg_restore`) da mesma versão
principal do servidor ou compatíveis. Opcional `--container NOME` executa esses clientes dentro
de container identificado. Nunca ler `.env`, inferir DB_URL, imprimir senha ou usar credenciais
na linha de comando; usar `.pgpass`/PGPASSFILE com permissão 0600. Variáveis libpq de autenticação
podem existir, mas host/porta/banco/usuário são sempre obrigatórios.

Exemplo **só para um banco descartável já criado**, sem API ligada a ele:

```bash
python3 oriens-api/ops/projects-refactor/db.py apply \
  --host localhost --port 5432 --database oriens_p0_empty --user postgres
```

O instalador verifica SHA-256 contra [baseline.sha256](baseline.sha256), abre uma conexão,
transação e advisory lock, recusa objetos preexistentes sem selo e executa DDL com
`ON_ERROR_STOP`. Grava versão `oriens-projects-v2`, hash do SQL e assinatura do catálogo.
Na repetição, verifica todos os três e sai sem reaplicar. Dados podem existir após instalação;
não entram na assinatura. Colunas/tipos/defaults/identidades/checks/FKs/índices/definições
de sequences, funções, triggers e tipos entram na assinatura; valores de sequences e nome do banco não entram.
O selo é um controle de operação, não mecanismo contra adulteração por superusuário.
Não editar schema selado: em P1, revisar baseline/checksum enquanto ainda não instalada em alvo real.
Depois do primeiro release, qualquer evolução exige nova versão/procedimento, não reescrever o selo.
DDL com falha reverte inteiro e conexão fecha; CLI retorna não zero sem dump de dados/segredos.
Registrar horário/alvo/commit/código de saída e mensagem sanitizada no registro de manutenção.

## Prova isolada reproduzível

```bash
python3 oriens-api/ops/projects-refactor/test_p0.py
```

O teste cria seu próprio `postgres:15-alpine` com nome aleatório, rede `none`, sem portas,
dados em tmpfs, sem volume do usuário e sem API/schedulers. Remove somente o ID criado
ao terminar. Nunca usa o container dev como destino. Exige imagem local ou download autorizado.
Fixtures são sintéticas `example.invalid`, sem senhas utilizáveis, tokens ou dados de conta.
Testa instalação/repetição, recusa do schema legado, adulteração/hash/versão, rollback total
de DDL, constraints, backup/restore dos dois schemas, contagens de todas as tabelas, conteúdo
representativo, sequences, selo restaurado e recusa de sobrescrever banco existente.
Não prova login nem JPA futuro; esses gates pertencem a P1/P2/P6.

## Backup e restore

Antes do snapshot real: manutenção, parar API/schedulers e qualquer escritor, registrar commit,
PostgreSQL/schema e inventário. Backup completo de todas as tabelas/schema/sequences do banco,
não apenas Projetos. O dump não inclui owners/ACLs nem roles globais: provisionar role/grants
conforme infraestrutura registrada, sem copiar senhas de roles. Guardar backup fora do volume
que será limpo, com acesso restrito e retenção aprovada; nunca versionar dump de dados.

```bash
python3 oriens-api/ops/projects-refactor/db.py inventory \
  --host HOST_EXPLICITO --port 5432 --database BANCO_EXATO --user OPERADOR
python3 oriens-api/ops/projects-refactor/db.py backup \
  --host HOST_EXPLICITO --port 5432 --database BANCO_EXATO --user OPERADOR \
  --file /CAMINHO_FORA_DO_VOLUME/snapshot.dump
```

Cria arquivo novo 0600 e sidecar `.dump.json` com SHA-256, versão PG e contagens por tabela.
Não sobrescreve arquivo existente. Snapshot e contagens só são comparáveis sem escritores.
Confirmar espaço livre e copiar ambos para armazenamento seguro; hash sozinho não prova restore.
Restaurar **primeiro** em outro banco vazio/isolado, com role/grants preparados e mesmo major PG:

```bash
python3 oriens-api/ops/projects-refactor/db.py restore \
  --host HOST_ISOLADO --port 5432 --database RECUPERACAO_EXATA --user OPERADOR \
  --file /CAMINHO_FORA_DO_VOLUME/snapshot.dump --confirm-restore RECUPERACAO_EXATA
```

Verifica checksum antes de conectar, exige nome literal de confirmação e banco vazio.
`pg_restore --single-transaction --exit-on-error`, sem `--clean`/`--create`; valida todas
as contagens contra sidecar. Operação com erro não é repetida automaticamente.
Usar somente arquivo produzido/conferido pelo operador: um dump SQL é código confiável.
Antes de liberar, conferir ainda conteúdo/relações/sequences e acesso com versão compatível
em rede isolada sem notificações externas; contagens iguais não substituem login e smoke tests.

## Checkpoint obrigatório para reset futuro

Esta entrega **não autoriza** reset real. Não existe comando reset no utilitário.
Em P6, produzir registro de manutenção fora do repositório com estes campos obrigatórios:

```json
{
  "action": "RESET_ENTIRE_ORIENS_DATABASE",
  "environment": "PREENCHER",
  "host": "PREENCHER",
  "port": 5432,
  "database": "PREENCHER",
  "codeCommit": "PREENCHER",
  "schemaVersion": "oriens-projects-v2",
  "baselineSha256": "PREENCHER",
  "backupPath": "PREENCHER",
  "backupSha256": "PREENCHER",
  "isolatedRestoreEvidence": "PREENCHER",
  "writersStopped": true,
  "authorization": "PENDING"
}
```

Apresentar alvo e perda de **usuários, autenticação, tarefas, projetos, finanças, suporte,
notificações e todo restante do banco**; só após autorização explícita preencher quem/quando
e guardar evidência. `PENDING`, campos ausentes, divergência de alvo/hash ou restore não
comprovado bloqueiam a operação. Build/deploy nunca preenchem esse marcador.

Depois do checkpoint, operador confere conexão a um banco administrativo diferente do alvo,
confere ausência de escritores e prepara um script SQL **literal com o nome aprovado**:
`DROP DATABASE "NOME_EXATO_APROVADO";` seguido de `CREATE DATABASE "NOME_EXATO_APROVADO" OWNER "ROLE_APROVADA";`.
Revisar o script e executar manualmente com `psql -X -v ON_ERROR_STOP=1` na conexão administrativa
explícita. Não usar FORCE, wildcard, URL inferida, loop de bancos, drop schema cascade ou limpeza
de arquivos. Esses comandos não são transacionais; em falha manter manutenção, registrar etapa
atingida e avaliar recuperação. Não repetir DROP se baseline/dados novos já existirem.
O instalador transacional roda **separadamente**, somente no banco vazio recém-criado.

## Versões, primeira conta e liberação

P6 só libera frontend/API compatíveis juntos, com `ddl-auto=validate` no perfil de execução.
Não existe convivência com código antigo no novo banco. P2 deve provar respostas 410/428
seguras ao cliente antigo, incluindo POST sem chave/modo e PUT integral. Cache antigo não
autoriza perder vínculos. Registrar baseline instalada e commit de ambas as aplicações.

Bloqueios encontrados no código atual, a resolver antes da liberação:

- JWT usa constante em SecurityConstants, ambos filtros a leem. P2 precisa receber uma única
  chave externa obrigatória (sem fallback), usá-la na emissão/verificação e falhar startup
  sem ela. P6 provisiona chave inédita no secret store/ambiente e reinicia API, invalidando
  todos os tokens anteriores. Não armazenar/registrar a chave no runbook ou código.
- `/user/register` recebe entidade e `/user/init-admin` é público; não tratar fluxo atual como
  bootstrap seguro. P2 precisa impedir role privilegiada enviada por cadastro e proteger/desabilitar
  bootstrap público. Para primeira conta, cadastro comum deve criar USER com hash de senha via
  serviço existente; promoção ADMIN só por operador autenticado em manutenção. Sem senha padrão.
- Perfil prod usa update e dev usa create. Não mudar agora: são incompatíveis com a baseline
  futura. Em P1/P6, validate deve ser provado contra PostgreSQL com os mappings novos antes do release.

Testar cadastro/login, usuário A/B, criação dos dois modos, task sem datas, Hoje/semana, jobs
sem dados reais e rollback antes de reabrir. Não enviar notificações para usuários reais no ensaio.
Imagens em armazenamento externo permanecem; reset do banco não autoriza limpeza de uploads.

## Rollback

Antes do DROP: abortar e retomar versão anterior se nada destrutivo ocorreu.
Após reset sem novas escritas: manter manutenção, restaurar backup validado num banco de
recuperação vazio, provisionar grants, apontar **versão anterior** para esse banco,
conferir contagens/acesso e então abrir. Downgrade de código sobre schema novo não é seguro.
Após novas escritas: não restaurar automaticamente snapshot antigo; exportar estado novo,
manter manutenção e decidir correção para frente ou aceitar explicitamente perda das novas escritas.
Nunca remover backups automaticamente nem restaurar por cima de banco com registros.
