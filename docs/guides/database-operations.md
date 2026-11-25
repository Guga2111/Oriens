# Inventário, backup e restore do PostgreSQL

O [utilitário de banco](../../scripts/projects-refactor/db.py) exige um alvo explícito. A API aplica o schema via [Flyway](../conventions/backend/persistence.md#banco-de-dados-e-migrações).

Antes do snapshot real: manutenção, parar API/schedulers e qualquer escritor, registrar commit,
PostgreSQL/schema e inventário. Backup completo de todas as tabelas/schema/sequences do banco,
não apenas Projetos. O dump não inclui owners/ACLs nem roles globais: provisionar role/grants
conforme infraestrutura registrada, sem copiar senhas de roles. Guardar backup fora do volume
que será limpo, com acesso restrito e retenção aprovada; nunca versionar dump de dados.

```bash
python3 scripts/projects-refactor/db.py inventory \
  --host HOST_EXPLICITO --port 5432 --database BANCO_EXATO --user OPERADOR
python3 scripts/projects-refactor/db.py backup \
  --host HOST_EXPLICITO --port 5432 --database BANCO_EXATO --user OPERADOR \
  --file /CAMINHO_FORA_DO_VOLUME/snapshot.dump
```

Cria arquivo novo 0600 e sidecar `.dump.json` com SHA-256, versão PG e contagens por tabela.
Não sobrescreve arquivo existente. Snapshot e contagens só são comparáveis sem escritores.
Confirmar espaço livre e copiar ambos para armazenamento seguro; hash sozinho não prova restore.
Restaurar **primeiro** em outro banco vazio/isolado, com role/grants preparados e mesmo major PG:

```bash
python3 scripts/projects-refactor/db.py restore \
  --host HOST_ISOLADO --port 5432 --database RECUPERACAO_EXATA --user OPERADOR \
  --file /CAMINHO_FORA_DO_VOLUME/snapshot.dump --confirm-restore RECUPERACAO_EXATA
```

Verifica checksum antes de conectar, exige nome literal de confirmação e banco vazio.
`pg_restore --single-transaction --exit-on-error`, sem `--clean`/`--create`; valida todas
as contagens contra sidecar. Operação com erro não é repetida automaticamente.
Usar somente arquivo produzido/conferido pelo operador: um dump SQL é código confiável.
Antes de liberar, conferir ainda conteúdo/relações/sequences e acesso com versão compatível
em rede isolada sem notificações externas; contagens iguais não substituem login e smoke tests.
