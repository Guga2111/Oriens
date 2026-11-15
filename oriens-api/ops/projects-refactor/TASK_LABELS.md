# Evolução aditiva — etiquetas de tarefas por conta

Revisão: `oriens-task-labels-v1`, sobre a baseline selada `oriens-projects-v2`.
Não é uma reinstalação: **não executar DROP/CREATE ou reset de banco** para esta
atualização. baseline.sql e baseline.sha256 permanecem inalterados.

## Conteúdo

- `task-labels.sql`: catálogo da conta e vínculos N:N com FK composta de dono.
- `task-labels.sha256`: checksum verificado antes de qualquer DDL.
- `task_labels.py`: evolução explícita/transacional com advisory lock, selo e
  verificação de drift. Na repetição apenas verifica a revisão já aplicada.
- `test_task_labels.py`: prova descartável da migração e suas constraints.

A revisão acrescenta uma unicidade `(id,user_id)` em tasks e duas tabelas. Não
muda nem copia tarefas, projetos, tags financeiras ou seus IDs. O selo passa a
representar a nova revisão e seu catálogo completo.

## Instalação em banco já selado

1. Identificar explicitamente ambiente, host, porta, banco e usuário; guardar os
   hashes dos artefatos API/frontend/SQL. Não inferir alvo de `.env` ou do compose.
2. Parar API/schedulers/escritores e abrir manutenção. Fazer backup completo com
   `db.py backup`, conferir SHA-256/contagens e ensaiar restore em banco isolado.
3. Executar o comando abaixo **somente com os alvos literais já aprovados**.
   Não colocar senha nos argumentos; usar `.pgpass`/PGPASSFILE protegido.

```sh
python3 oriens-api/ops/projects-refactor/task_labels.py \
  --host HOST --port PORTA --database BANCO --user USUARIO
```

4. Repetir o mesmo comando para verificar versão/checksum/catálogo. Falha de DDL
   reverte a transação inteira; drift ou revisão desconhecida é recusado antes.
5. Publicar API e frontend compatíveis juntos. A API deve usar `ddl-auto=validate`.
   Startup, build, testes Maven comuns e deploy não aplicam este SQL automaticamente.
6. Smoke: criar etiqueta, selecionar em tarefa avulsa e de projeto; renomear e
   conferir ambos; mover tarefa; excluir etiqueta com confirmação; conferir tarefas
   preservadas. Confirmar que outra conta não pode ler/atribuir/alterar a etiqueta.

Para um banco **novo e vazio**, aplicar primeiro `db.py apply` para instalar a
baseline e depois o comando de evolução acima. Não executar `db.py apply` para
verificar um banco já evoluído: ele verifica a revisão anterior e recusará o selo.
`db.py backup`, `inventory` e `restore` continuam válidos para ambas as revisões.

## Rollback e compatibilidade

O DDL é aditivo. Reverter código exige reverter API/frontend juntos: a API anterior
recusa labelIds, mesmo vazio. Manter as tabelas/etiquetas preservadas durante um
rollback de aplicação; não há rollback destrutivo automático. Para recuperar o
banco anterior, usar o backup conferido em um alvo vazio e isolado; conferir todas
as contagens e só então coordenar a troca do alvo em manutenção. Nenhuma remoção
ou sobrescrita de banco existente é autorizada por este documento.

Recibos anteriores de criação de tarefas continuam válidos: ausência de etiquetas
ou labelIds=[] conserva o hash anterior. Criações com IDs usam ordenação canônica.
Excluir etiqueta invalida as versões das tarefas afetadas; nomes/cores têm versão
própria. O serviço serializa operações por conta antes dos locks de projeto/tarefa.

## Prova reproduzível

```sh
python3 oriens-api/ops/projects-refactor/test_task_labels.py
python3 oriens-api/ops/projects-refactor/test_p1.py
python3 oriens-api/ops/projects-refactor/test_p2.py --labels-browser
```

Cada script cria e remove somente seu PostgreSQL descartável, com dados sintéticos.
O teste de navegador exige o build de produção frontend e o Brave instalado. Nenhum
banco compartilhado, credencial real ou serviço externo é necessário. A opção
`--labels-browser` usa endpoints HTTP/JWT/JPA reais para tarefas, projetos e etiquetas;
apenas o shell/perfil/preferências usam o fixture local.
