# Projetos — entrega P0

Implementação da etapa **Baseline de contratos**, autorizada em 13/11/2026.
Base de código investigada: `de2650ee0cf9e5843f6d2803aa237b105b64b444`.
P1–P6 permanecem pendentes; não há nova API/interface de produto ativa nesta entrega.

## Artefatos

- [Contratos HTTP](../contracts/projects-v2.md) e [DTOs tipados](../contracts/projects-v2.ts):
  IDs, presença/null, enums separados, datas, leituras/escritas, ETag, versão estrutural,
  recibos idempotentes, erros estáveis e rejeição futura de clientes antigos.
- [Inventário e runbook](../../oriens-api/ops/projects-refactor/README.md): todas as entidades,
  estratégia JPA/SQL, instalação, backup, restore, checkpoint de reset e rollback.
- [Schema observado](../../oriens-api/ops/projects-refactor/observed-schema.sql): schema-only
  do PostgreSQL local 15.19, sem registros, credenciais, owners ou ACLs.
- [Baseline](../../oriens-api/ops/projects-refactor/baseline.sql), checksum SHA-256
  `6fa68a942c6ff5029b733ba34f8d33089168d75c209d04d427bbb434e2c3e704`,
  versão `oriens-projects-v2`; fora do diretório de migrations automáticas.
- [Operações explícitas](../../oriens-api/ops/projects-refactor/db.py) e
  [prova PostgreSQL](../../oriens-api/ops/projects-refactor/test_p0.py), sem dependências Python extras.

## Rastreio e decisões

Conferidos mappings de todas as entidades, configs JPA, ausência de Flyway, geração de IDs,
enum ordinal de objetivos, timestamps, índices e FKs contra schema local real.
Nove tabelas atuais; onze na baseline, mais selo operacional. Não se faz backfill.
Mantidos os nomes físicos `project` e `project_objectives`; novos objetivos são entidades com ID,
sem `completed` independente. Mantida sequence de reset de senha com incremento 50.

Serviço continua responsável por modo DEVELOPMENT, defaults válidos e locks; banco protege
referências e checks locais, inclusive status da coluna e completedAt. Não há cascata para Task.
Mapeamentos novos e `ddl-auto=validate` são trabalho P1, não ativados contra a API antiga.

Precisões de contrato necessárias à seção 9 da SPEC: projectVersion na criação de objetivo,
X-Project-Version em DELETE de objetivo/tarefa vinculada, envelopes que retornam versão estrutural
e TTL de replay de criação de 24 h. Nenhuma nova decisão de produto.

Baseline só aceita banco vazio ou instalação já selada com versão/SQL/catálogo correspondentes.
Lock de instalação e DDL na mesma transação; erro reverte tudo. Checks de enum têm cast explícito
para text[] para manter definição estável após pg_dump/restore no PG15.
Backup/restore preservam todas as tabelas e sequences, com streaming, arquivos privados,
checksum, contagens e confirmação literal do destino vazio. Não existe comando automático de reset.

## Prova executada

`python3 oriens-api/ops/projects-refactor/test_p0.py`: **11 testes aprovados** em PostgreSQL 15
descartável, rede none, sem portas, tmpfs, fixtures sintéticas. Cobertura:

- Instalação completa, repetição e dois instaladores concorrentes.
- Recusa do schema legado sem alterá-lo; divergência de catálogo/versão/checksum.
- Rollback integral de DDL inválido e restore interrompido.
- FKs de dono/projeto/objetivo/coluna, status coerente, exclusão RESTRICT, horário sem dia,
  24:00, data impossível, título vazio e nome de coluna normalizado duplicado.
- Backup/restore dos schemas legado e novo, contagens de todas as tabelas, conteúdo sintético,
  sequences e selo restaurado em banco com outro nome.
- Recusa de destino ocupado, confirmação divergente, arquivo corrompido e sidecar inválido.

Contrato compilado com TypeScript instalado:
`oriens-front/node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2020 docs/contracts/projects-v2.ts`.
Scripts compilados com `python3 -W error -m py_compile`; whitespace conferido.
Containers criados para o ensaio foram removidos; banco/container dev apenas teve schema lido.

## Limites e próximos gates

O restore ensaiado usa **fixtures sintéticas**, não é backup/restore validado do alvo real.
Ambiente/host/banco real, localização/retencão do backup e autorização destrutiva continuam abertos
para P6. O schema de produção ainda deve ser confrontado com o inventário local.
Owners/ACLs/roles são provisionados separadamente pela infraestrutura; arquivos de uploads não são apagados.

JWT fixo no código e bootstrap público de administrador impedem considerar segura a primeira conta
do release novo. Runbook exige externalização/rotação da chave, proteção de cadastro/bootstrap,
e smoke test real de login antes da liberação. Esta P0 prepara a estratégia; não altera autenticação.
Sem validação JPA futura, novos handlers de HTTP, jobs, cache, migração ou implementação de telas.

`design-taste-frontend` foi considerada no escopo APP SCREENS: esta etapa não altera regiões visuais,
logo não houve draw, lint visual, inspector ou screenshots. A inspeção de produto permanece em P4–P6.
Não houve reset real, deploy, exclusão de registros ou cópia de dados pessoais.
