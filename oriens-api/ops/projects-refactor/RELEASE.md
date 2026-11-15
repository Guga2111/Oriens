# P6 — runbook de liberação coordenada

Estado: preparação e ensaios locais; **alvo real não informado, reset não autorizado**.
Este arquivo não executa comandos. Build, testes e deploy não executam reset.
Evidências da preparação: [P6](../../../docs/plans/2026-11-13-projects-refactor-p6.md).
Procedimento de banco e comandos completos: [README](README.md).

## Artefatos e pré-condições

1. Escolher um commit revisado contendo frontend/API/baseline; construir juntos.
   Registrar SHA do commit, do JAR/imagem, do frontend e de baseline.sql.
   O manifesto do ensaio é `docs/screenshots/projects-refactor/p6/build.json`;
   não substitui os hashes dos artefatos que o operador publicar.
2. API deve usar perfil `prod`, `ddl-auto=validate`, PostgreSQL compatível com os
   clientes de backup e banco da baseline `oriens-projects-v2`. Não iniciar código
   antigo sobre essa baseline. Não usar o perfil dev para instalar banco real.
3. Provisionar **JWT_SECRET nova**, aleatória, com pelo menos 64 bytes, por secret
   store/ambiente do processo; nunca por arquivo versionado, argumento de processo,
   log ou evidência. Emissão e verificação usam a mesma configuração obrigatória.
   Chave ausente/curta impede startup. Os três Compose repassam JWT_SECRET e recusam
   variável vazia. Reiniciar API após provisionar para invalidar tokens anteriores.
4. Preparar manutenção que bloqueie frontend, API e escritores/jobs. Confirmar
   espaço, retenção, acesso restrito e local de backup fora do volume do banco.
   Preservar uploads de projeto/perfil; esta operação não autoriza apagá-los.
5. Provar acesso à versão anterior e ao banco de recuperação em rede isolada,
   sem envio externo de notificações. Confirmar roles/grants fora do dump.

## Registro do checkpoint — fora do Git

Copiar o modelo abaixo para o registro restrito da operação. Preencher alvos
literais, autor responsável e evidência de aprovação antes de qualquer DROP.
Não incluir credenciais nem dados pessoais. `PENDING` bloqueia a operação.

```json
{
  "action": "RESET_ENTIRE_ORIENS_DATABASE",
  "environment": "PREENCHER",
  "host": "PREENCHER",
  "port": 5432,
  "database": "PREENCHER",
  "databaseOwnerRole": "PREENCHER",
  "codeCommit": "PREENCHER",
  "apiArtifactSha256": "PREENCHER",
  "frontendManifestSha256": "PREENCHER",
  "schemaVersion": "oriens-projects-v2",
  "baselineSha256": "PREENCHER",
  "backupPath": "PREENCHER_FORA_DO_VOLUME",
  "backupSha256": "PREENCHER",
  "isolatedRestoreEvidence": "PREENCHER_CONTAGENS_CONTEUDO_SEQUENCES_ACESSO",
  "writersStopped": false,
  "jwtRotationProvisioned": false,
  "authorization": "PENDING",
  "authorizedBy": "PENDING",
  "authorizedAt": "PENDING",
  "operator": "PREENCHER"
}
```

Apresentar ao aprovador o ambiente/host/banco exatos e a perda de **todos os
usuários, autenticação, tarefas, projetos, finanças, suporte, notificações e demais
registros do banco inteiro**. A aprovação de implementar P6 não autoriza essa perda.
O ensaio descartável não comprova o backup do alvo real.

## Sequência no alvo aprovado

1. Abrir manutenção; parar API/schedulers e outros escritores. Registrar horário,
   versão e inventário via `db.py inventory` com host/porta/banco/usuário explícitos.
2. Executar `db.py backup` para arquivo novo fora do volume (0600). Copiar dump e
   sidecar para o armazenamento aprovado; conferir hash e todas as contagens.
3. Criar banco de recuperação vazio e isolado; `db.py restore` exige confirmação
   literal desse banco. Conferir contagens, conteúdo representativo, relações,
   sequences e login com a versão anterior. Guardar evidência sanitizada.
4. Revisar checkpoint com alvo/hash/restore/ausência de escritores confirmados e
   obter autorização destrutiva explícita. Qualquer divergência interrompe a operação.
5. Operador revisa script SQL literal DROP/CREATE do banco aprovado, conforme README,
   em conexão administrativa distinta do alvo, com `psql -X -v ON_ERROR_STOP=1`.
   Sem FORCE, curingas, loops ou exclusão de arquivos. DROP/CREATE não são transacionais;
   em falha manter manutenção e registrar a etapa; não repetir DROP automaticamente.
6. Separadamente aplicar `db.py apply` no banco vazio. Repetir apenas a verificação
   idempotente para conferir versão/hash/catálogo. Falha de DDL reverte a transação.
7. Iniciar API nova com validate e JWT_SECRET rotacionada, e frontend compatível.
   Manter manutenção externa enquanto executa os smoke tests abaixo.
8. Registrar resultado e responsável pela reabertura. Somente abrir se todos os
   gates passarem. Guardar backup e evidências; não fazer limpeza automática.

## Primeira conta e smoke tests depois da instalação

- Cadastrar uma conta pessoal de teste pelo cadastro comum (`POST /user/register`);
  autenticar em `/authenticate`. Cadastro só admite campos de perfil e força USER,
  ID novo e hash BCrypt. Não existe senha padrão nem bootstrap público de ADMIN.
  `/user/init-admin` é negado inclusive para usuário autenticado.
- Se for necessário um ADMIN, operador de banco autenticado em manutenção confere
  o ID/email de uma conta já cadastrada e promove somente essa linha em transação.
  Registrar ID, operador e aprovação; nunca inserir senha/hash padrão ou expor endpoint
  público. Reautenticar para renovar a claim após a promoção.
- Criar simples sem objetivo, acrescentar objetivo; criar desenvolvimento e verificar
  exatamente três colunas iniciais/padrões. Criar tarefa sem datas: não aparece em Hoje.
- Planejar a tarefa para hoje com e sem horário; conferir mesmo ID no quadro/Hoje/semana,
  timeline e foco. Concluir/reabrir/mover: coluna, status e completedAt coerentes; objetivo
  permanece manual. Fazer hoje limpa horário e preserva prazo.
- Cancelar: some do trabalho ativo e continua no quadro/Todos os dados. Arquivar:
  tarefa planejada continua editável em Hoje. Exclusão de projeto só após preview:
  tarefas ficam avulsas com IDs/datas/status preservados.
- Segunda conta não lê/escreve IDs da primeira. Cliente antigo recebe 410 nas rotas
  retiradas, 428 sem versão/chave, conflito 409 não sobrescreve. Requisição sem JWT e
  token anterior à rotação devem ser rejeitados.
- Conferir estatísticas, resumo com intervalo explícito, favorito/sidebar e Todos os
  dados. Jobs usam Recife e plannedDate/startTime; sem horário não há lembrete de início.
  Ensaio de notificações só para conta de QA, sem destinatários reais externos.
- Teclado e 390/768/1440, claro/escuro: menu, editor, mover sem drag, timeline, retorno
  de navegação, erro/retry/conflito. Confirmar que frontend não chama API antiga.

## Rollback e parada

Antes do DROP: abortar e retomar versão anterior se nenhuma alteração destrutiva
ocorreu. Depois do reset sem novas escritas: manter manutenção, restaurar snapshot
validado em banco de recuperação vazio, apontar **código anterior** para esse banco,
conferir contagens/acesso e só então abrir. Não fazer downgrade sobre schema novo.
Após novas escritas: manter manutenção e exportar estado novo; correção para frente
ou restauração com perda dessas escritas exige decisão explícita. Nunca restaurar
por cima de banco ocupado nem remover backups automaticamente.
