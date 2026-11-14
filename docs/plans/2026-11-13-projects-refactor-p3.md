# Projetos — entrega P3

Etapa **leituras e consumidores**, sobre P1/P2. P4–P6 continuam pendentes.
Sem deploy, reset, migração de registros ou acesso a banco compartilhado.

## Comportamento e responsáveis

O rastreamento encontrou agenda por dueDate no controlador, consultas por tarefa
para projetar vínculos, jobs dependentes do fuso do servidor e estatísticas
misturando conclusão, planejamento e prazo. As três datas passam a ter donos
explícitos: plannedDate na agenda, dueDate nos prazos e completedAt nas conclusões.

- WorkReadService monta DayResponse com partição exclusiva por ID: planejadas,
  pendentes anteriores, atenção e concluídas. Recuperação só em Hoje/Recife.
  Canceladas ficam fora; tarefas sem datas não são inseridas artificialmente.
  Sem horário ordena por prioridade/ID; agenda com horário ordena por hora.
- Range inclusivo usa planejamento e retorna intervalo/fuso. Resumo semanal usa
  o mesmo conjunto, aceita intervalo explícito e identifica seu intervalo; default
  domingo–sábado. Planning-count exclui a tarefa em edição e separa concluídas.
- Listagem paginada aceita projeto, canceladas e intervalo no campo explícito
  plannedDate/dueDate. Intervalo sem dateField, campo desconhecido e fim anterior
  ao início recebem 400. Projeto/exclusão de tarefa de outro dono recebem 404.
- Board respeita o envelope P0: colunas ordenadas com contagens antes/depois dos
  filtros, tasks visíveis separadas e total/visible com TaskCounts. Mantém colunas
  vazias e ETag da versão estrutural. Filtros combinam objetivo, planejamento,
  prazo ultrapassado e abertas. Não escreve nem reordena o conjunto oculto.
- Summary de cada projeto conta objetivos e tarefas da mesma base autorizada;
  não canceladas incluem concluídas. SIMPLE recebe null nos campos de tarefas,
  DEVELOPMENT vazio recebe zero. Próxima planejada ignora planos passados,
  desempata por data/hora/prioridade/ID, sem hora depois das com hora. Próximo
  objetivo pendente tem prazo, com desempate por ID.
- Objetivos no detalhe também recebem contagens de tarefas vinculadas. Contagens
  não alteram sua conclusão manual. Totais de projetos ativos/favoritos/arquivados
  vêm de /project/user/{userId}/summary, independentes da página carregada.
- Projeções usam consultas em lote por tipo de vínculo; listas não fazem consulta
  por card/tarefa. O quadro continua integral, conforme a carga pessoal prevista.
- Jobs usam Clock/Recife, plannedDate + startTime e estados PENDING/ON_DOING.
  A comparação usa LocalDateTime, inclusive na virada do dia. Sem horário não
  gera início; planejamento perdido não gera vencimento.
- TaskReminderService relê sob lock e grava notificação/flag na mesma transação.
  Edição de referência reinicia apenas a flag correspondente; estado terminal
  continua invalidando ambas mesmo quando datas mudam no mesmo PATCH.
- Estatísticas contam conclusões por completedAt, volume por plannedDate sem
  canceladas, taxa sobre o mesmo conjunto planejado e prazo por dueDate em estados
  ativos. Intervalo da taxa fica no texto. Base anterior zero não vira +100%
  fictício; sem histórico a variação é null.

## Frontend e propriedade do cache

TaskService e ProjectService existentes são os donos dos contratos HTTP tipados.
Retiradas suas funções antigas sem consumidores de toggle/unarchive. Não foi
introduzido serviço paralelo de tarefas de projeto.

useWork fornece consultas por usuário/escopo, signals de cancelamento e mutações
confirmadas pelo servidor. Chaves separam dia, semana, detalhe, listas, quadro,
sidebar, planejamento e estatísticas. A invalidação usa IDs afetados e datas
anterior/nova; Hoje é invalidado também por sua recuperação. Escrita salva com
refetch falho retorna saved/refreshFailed, sem transformar o sucesso em retry de
POST. Criação recebe chave explícita, reutilizável pelo formulário, e não faz
retry automático. Login/logout limpam o QueryClient compartilhado.

Todos os dados e Estatísticas consomem Query. Os escopos de filtro/data têm
chaves próprias, de modo que resposta antiga não aparece sob o escopo novo.
Erros de consulta ficam locais com retry, sem transformar falha de escrita em
novo POST. Respostas de tarefa/projeto rejeitam IDs e versões fora de inteiros
seguros antes de virarem precondições de escrita.

Todos os dados separa Planejada para/Horário/Prazo final, aceita nulos, filtra
canceladas e busca projetos por nome, inclusive arquivados. Objetivos/tarefas são
contagens explícitas, sem percentual global inventado. Tablet/celular usam listas
e filtros em sheet; títulos podem quebrar linha.

Os consumidores legados receberam guardas para horário/prazo nulos, CANCELLED
nos rótulos, semana por plannedDate e relógio da timeline em Recife. A troca dos
fluxos de escrita de TaskRow/TaskChip pelo editor e os novos blocos de Hoje
continuam na integração P4/P5; esta entrega não declara essas jornadas prontas.

## Prova

Executado na raiz, salvo indicação:

| Comando | Resultado |
| --- | --- |
| python3 oriens-api/ops/projects-refactor/test_p2.py | 11 testes reais MVC/JPA/PostgreSQL: 8 P2 + 3 cenários P3 compostos; passou |
| python3 oriens-api/ops/projects-refactor/test_p1.py | 13 testes PostgreSQL de invariantes/locks/rollback; passou |
| mvn -q -o -f oriens-api/pom.xml test | 40 comuns passaram; só os 2 erros preexistentes de P1/P2; 24 opt-in desabilitados |
| npm test, em oriens-front | 76 testes em 20 arquivos; passou |
| tsc --noEmit -p tsconfig.app.json | passou |
| ESLint de hooks, contratos/serviços, helpers novos, tabelas, AllData e testes Query | passou |
| npm run build | passou; aviso existente de bundle maior que 500 kB |
| lint.mjs --app nas tabelas/AllData | zero FAIL/WARN |
| inspect.mjs --app no build de produção | zero FAIL em 1440/768/390; relatórios e ressalvas no registro visual |
| check-browser.mjs | filtros, projeto, datas, canceladas, contagens, foco, reduced-motion e overflow passaram |
| git diff --check | passou |

As provas PostgreSQL usam baseline validada em container descartável/loopback,
fixtures sintéticas e remoção em finally. O selo do catálogo permaneceu intacto.
Foram ampliados os testes P2 existentes para exercitar serviços reais também nas
estatísticas e notificações. Não foi criado um segundo mecanismo de testes do banco.

Cenários P3 incluem: UTC já no dia seguinte e Recife ainda no anterior, partição
sem duplicação, plano futuro com prazo hoje, plano perdido sem prazo, ausência de
datas/horário, canceladas e concluídas fora da agenda, exclusão no planning-count,
intervalos inclusivos/inválidos, filtros de quadro, contagens reais, autorização
dos agregados, ETag, filtro explícito de data, lembrete ON_DOING, deduplicação,
revalidação de terminal, janela cruzando meia-noite e completedAt independente
do planejamento/prazo. Query cobre resposta fora de ordem, invalidação seletiva,
refetch falho após confirmação e limites numéricos.

Os dois erros gerais continuam sendo contextLoads sem file.upload-project-dir
e UserServiceImplTest sem ApplicationEventPublisher. Não foram corrigidos neste
escopo. Fixtures de TaskRepositoryTest foram atualizadas para representar
planejamento e conclusão independentes do prazo, incluindo exclusão de canceladas.

## Visual e limites da entrega

Mantidos Horizonte e editorial-greeting, seed 275775847, keep palette,type.
Sem draw novo, imagens externas, dados de prova inventados no produto ou animações
de entrada. Inventário, comparação antes/depois, fixtures e crítica APP SCREENS:
[registro visual](../screenshots/projects-refactor/README.md).

A inspeção é de builds de produção com API sintética local. A prova da API real
é a suíte PostgreSQL; não foi alegado E2E navegador→API real do produto completo.
Editor/quadro e Hoje completo, inspeção escura exaustiva e liberação continuam
P4–P6. Não publicar o frontend intermediário contra a API antiga ou considerar
as telas legadas de Projetos/Hoje compatíveis apenas por este incremento.

RTK.md referenciado nas instruções não estava presente na raiz ou nos pais
verificados; não houve bloqueio de aprovação por esse arquivo ausente.
