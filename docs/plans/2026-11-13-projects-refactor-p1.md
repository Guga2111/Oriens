# Projetos — entrega P1

Implementação da etapa **Domínio e persistência**, sobre a P0 do commit
`8d679f2`. P2–P6 permanecem pendentes. Esta entrega não libera uma API ou interface v2.

## Mapeamentos e propriedade das regras

- `Project`: modo SIMPLE/DEVELOPMENT, padrões de coluna, versão e objetivos ordenados
  por posição/ID. Avanço deriva exclusivamente do status dos objetivos.
- `Objective`: entidade em `project_objectives`, ID estável, projeto, posição, versão,
  prazo opcional e enum próprio PENDING/CONCLUDED. Removido o campo `completed` independente.
- `ProjectColumn`: entidade com nome, significado, posição e versão.
- `Task`: planejamento separado de prazo, horário anulável, vínculos/posição opcionais,
  versão, CANCELLED e criação como Instant. Prioridade padrão MEDIUM.
- `CreationReceipt`: mapeamento da tabela já definida pela P0, com UUID, JSONB e Instants.
  A política de criação, replay e expiração continua na P2; nenhum endpoint usa recibos ainda.

A baseline SQL, seus índices, checks, FKs compostas e checksum da P0 foram reutilizados
sem alteração. Os IDs escalares de vínculo em Task espelham essas FKs; não introduzem
cascatas JPA. Não há cascata de remoção de projeto/coluna/objetivo para tarefas.
Os perfis **dev e prod usam `ddl-auto=validate`**: o startup recusa schema incompatível,
sem criar, atualizar ou resetar tabelas. A baseline exige instalação operacional explícita.

`ProjectWorkService` concentra a fronteira transacional do agregado novo:

- Criação simples, criação de desenvolvimento com três colunas/padrões e conversão
  idempotente para desenvolvimento, preservando objetivos e metadados.
- Inclusão/edição/remoção de objetivos por ID; editar título/prazo não alterna conclusão.
- Inclusão, edição, ordem completa e padrões do quadro. Nome não determina significado;
  nomes duplicados, kind ocupado e remoção sem destino/substitutos válidos são rejeitados.
- Criação, edição, ordenação, transferência e remoção de tarefas; validação de dono,
  projeto DEVELOPMENT, objetivo/coluna do mesmo projeto e horário com planejamento.
- Estado canônico coerente com a coluna; conclusão idempotente no relógio injetável de
  America/Recife; reabertura/cancelamento limpam completedAt. Concluir tarefa não conclui objetivo.
- Exclusão explícita e atômica: projeto desvincula tarefas; objetivo limpa somente objectiveId;
  coluna move tarefas antes de remover. Datas, execução e identidade sobrevivem ao detach.
- Locks de projetos em ID crescente, seguidos de releitura/lock da tarefa. Versões são
  conferidas após os locks; alterações estruturais forçam incremento de Project, e mudanças
  nos filhos/posições incrementam suas versões pelo JPA. Não há bulk update que ignore versões.

Os DTOs em `entity/dto/work` separam escrita de entidade. PATCH distingue ausência de
null explícito sem nova dependência; versão ausente, conflito, campo inválido e recurso
inexistente têm códigos de domínio separados para o adaptador HTTP da P2.
O serviço recebe o ID do proprietário pelo chamador confiável; os corpos não contêm userId.
A resolução pelo principal e os envelopes HTTP/ETag ainda são responsabilidade da P2.

Os serviços/controladores antigos receberam apenas os ajustes de compilação exigidos pela
promoção de Objective e pelo Instant de Task. As rotas antigas não são adaptadores v2:
a P2 deve delegar as novas escritas ao domínio, retirar as escritas antigas e ativar a
rejeição segura de clientes obsoletos antes de qualquer liberação. Não publicar esta
etapa isoladamente contra o frontend atual. Leituras, estatísticas e jobs continuam na P3.

## Prova executada

```bash
cd oriens-api
python3 ops/projects-refactor/test_p1.py
mvn -q test
```

**13 testes PostgreSQL/JPA aprovados**, com PostgreSQL 15 descartável, porta efêmera
restrita a localhost, tmpfs e fixtures sintéticas. O runner cria seu próprio container,
instala a baseline com `db.py`, exige `ddl-auto=validate`, executa a suíte e verifica
novamente o selo do catálogo; remove o container em `finally`. Nenhum banco existente
é selecionado pelo runner. A suíte PostgreSQL fica desabilitada no Maven comum e só
aceita URL explícita de loopback para o banco `oriens_p1_proof`.

Cobertura:

1. SIMPLE, objetivos com ID, conversão repetida e exatamente três colunas/padrões.
2. Planejamento/prazo/horário anuláveis e independentes; prioridade e Instant.
3. Conclusão em Recife perto da virada UTC, repetição, movimento entre concluídas,
   reabertura/cancelamento e objetivo manual preservado.
4. Edição de objetivo sem toggle, ausência/null de PATCH e data impossível rejeitada.
5. Renomeação/reordenação, kind ocupado, destino e padrões de remoção.
6. Detach na exclusão de projeto/objetivo com identidade, execução e datas preservadas.
7. Rollback após detach/exclusão e após movimento/remoção de coluna, incluindo versões.
8. Dono, versão ausente/desatualizada e FKs/checks PostgreSQL contra SQL inválido.
9. Ordenação e transferência entre projetos numa única transação.
10. Exclusões sucessivas seguidas de criação mantêm a tarefa nova ao final.
11. Repetir conclusão preserva posição; coluna vazia pode mudar significado.
12. Roundtrip UUID/JSONB/Instant do recibo sem FK para recurso já removido.
13. Dois escritores concorrentes serializados pelo lock do projeto, com conflito do obsoleto.

A suíte Maven geral executou 55 casos: **40 aprovados, 13 desabilitados** (a prova
PostgreSQL opt-in) e **2 erros preexistentes**. Ambos foram reproduzidos numa cópia
intacta do commit `8d679f2` em `/tmp`, com o mesmo comando Maven restrito a essas classes:

- `OriensApiApplicationTests.contextLoads`: propriedade `file.upload-project-dir` ausente.
- `UserServiceImplTest.whenSaveUser_withNewEmail_thenShouldReturnSavedUser`:
  mock de `ApplicationEventPublisher` ausente, causando NullPointerException.

Os testes existentes de TaskRepository, TaskService, NotificationRepository,
NotificationService e UserRepository passaram. Não se alteraram testes de usuários ou
configuração de uploads para esconder falhas alheias à P1. Compilação Java com release 17
(Maven/JDK 25 disponíveis no host), compilação estrita do runner Python e `git diff --check`
também executadas. Não foram adicionadas dependências.

## Limites operacionais e visual

Sem reset, migração de registros, deploy, alteração do banco dev ou autorização destrutiva.
A baseline continua deliberadamente incompatível com o schema legado; backup/restore,
checkpoint do alvo real e liberação continuam conforme P0/P6.

A skill `design-taste-frontend` foi aplicada ao escopo: P1 não altera regiões visuais.
Mantidos Horizonte e a direção histórica `editorial-greeting`, seed 275775847,
`keep palette,type`. Sem novo draw, imagens, animações, lint visual, screenshots ou
notas de crítica: essas provas pertencem às etapas de interface P4–P6.
