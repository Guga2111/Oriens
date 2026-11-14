# Projetos — entrega P4

Implementação das telas de Projetos da SPEC, sobre P2/P3. P5/P6 continuam
pendentes. Sem deploy, reset de banco compartilhado ou migração de registros.

## Comportamento e responsáveis

O rastreamento inicial encontrou objetivos por índice, PUT integral de projeto
e tarefa, favoritos sem versão e cópias de consultas na listagem/sidebar.
Os novos componentes usam os contratos por ID/versão, ProjectService,
TaskService e hooks TanStack Query existentes.

- ProjectsPage usa páginas com chaves por usuário e preserva páginas carregadas
  quando o próximo carregamento falha. O resumo vem do servidor. Favoritos
  filtra os cards carregados, com estado vazio explicitamente limitado à página;
  Carregar mais permite continuar a busca sem prometer uma ordenação global.
- Cards distinguem Simples/Desenvolvimento, contagens de objetivos/tarefas,
  canceladas, próximo passo e atenção. Percentual existe apenas no simples e
  deriva da mesma fração da barra. Zero objetivos e zero tarefas não canceladas
  têm linguagem própria. Atenção mostra apenas contagens positivas.
- CreateProjectDialog oferece Simples inicialmente, Desenvolvimento como escolha
  explícita, objetivos opcionais e cor neutra. Edição usa PATCH de metadados,
  sem substituir objetivos, modo ou estado. Capa usa o upload existente, limite
  de 5 MB, MIME permitido e If-Match.
- ProjectDetailPage conserva a rota, resumo/calendário do simples, ações de
  favorito/arquivo, conversão confirmada e exclusão com preview versionado.
  IDs inválidos não ficam carregando indefinidamente.
- ProjectObjectives é reutilizado no simples e na aba de desenvolvimento.
  Objetivos são endereçados por ID, com prazo opcional e conclusão manual;
  editar/remover prazo não envia status. Desenvolvimento acrescenta contagens,
  expansão de tarefas e criação com objetivo/coluna padrão preenchidos.
  Excluir objetivo explica que as tarefas permanecem no projeto.
- ProjectBoard usa filtros combináveis e contagens gerais/visíveis do servidor.
  No celular mostra um seletor de coluna e filtros em Drawer. Menus movem entre
  colunas, acima/abaixo quando não filtrado, reabrem canceladas pelo destino
  padrão e permitem excluir uma tarefa com confirmação/versionamento.
- Arraste HTML nativo fica apenas no handle, no desktop. Usa o mesmo PATCH do
  menu. Pode inserir antes de uma tarefa ou ao final; reordenação dentro da
  coluna é desativada com filtros. Não há sensores próprios nem dependência
  adicional. Celular usa menu, sem exigir arraste.
- BoardSettings adiciona, renomeia, reordena e exclui colunas com versões.
  Significado de coluna ocupada fica bloqueado. Remoção usa totalCount mesmo
  com filtro, mostra destino/estado resultante e exige substituição de padrões.
  Defaults são seletores dos significados correspondentes, sem cores livres.
- TaskEditor é o formulário único de tarefa. CreateTaskDialog e EditTaskDialog
  são adaptadores; o último carrega o snapshot atual antes de abrir. Título,
  descrição, prioridade, localização, dia planejado, horário e prazo ficam no
  mesmo formulário. Projeto é opcional e pesquisável; somente desenvolvimento
  pode receber tarefa. Troca de projeto limpa objetivo com aviso e exige coluna
  explícita, cujo estado resultante é mostrado antes do salvamento.
- Retirar planejamento limpa dia/horário e preserva prazo. Planejar após o prazo
  avisa, mas permite salvar. Quantidade planejada é uma consulta independente;
  falhar não impede salvar. Datas são estritas, sem normalização de dias inválidos.
- DraftDialog confirma descarte e preserva rascunho em falha/conflito. Envios de
  criação sem confirmação mantêm payload/chave exatos, inclusive versões, com
  campos bloqueados para retry seguro. Descarte de envio incerto explica que ele
  pode ter sido salvo. Não há persistência de rascunhos sensíveis em storage.
- TaskRow/TaskChip usam useTaskActions/useTaskWrites para estado/exclusão,
  sem PUT integral ou caminhos HTTP concorrentes. A composição visual e as
  leituras completas de Hoje continuam P5.
- Sidebar usa useWorkSidebar/useProjectFlags; favorito envia estado e versão.
  Invalidações atualizam listas, detalhe, quadro, sidebar e projeções de tarefas;
  mudanças estruturais atualizam também planning-count. Erro de refetch após
  escrita confirmada é separado do sucesso e não produz outro POST.

## Correções necessárias reveladas pela integração

1. Vincular avulsa exigia targetProjectVersion no backend, contrariando o contrato
   aprovado. ProjectWorkService agora usa projectVersion quando não há origem;
   transferência entre projetos continua exigindo as duas versões. Regressão real
   prova vínculo, preservação de datas/ID e rejeição de transferência sem destino.
2. Editar tarefa sem alterar coluna agora omite columnId. Enviá-lo sempre faria o
   backend reinserir a tarefa no final, inclusive ao editar apenas texto.
3. Progress não repassava value ao Radix: leitores de tela não recebiam a fração
   visual. Corrigido no componente responsável e coberto pelo teste do card.
4. Controles nativos recebem color-scheme escuro. Controles móveis das regiões
   novas têm altura mínima de 44 px. A busca de localização mantém seleção por
   teclado; sem chave/serviço de mapas, endereço continua editável como texto.

## Prova

| Comando/prova | Resultado |
| --- | --- |
| npm test em oriens-front | 85 testes, 20 arquivos, passaram |
| tsc --noEmit -p tsconfig.app.json | passou |
| ESLint dos componentes, hooks, serviços e testes afetados | passou |
| npm run build | passou; avisos existentes de bundle, Browserslist e duration-[120ms] |
| python3 oriens-api/ops/projects-refactor/test_p2.py | 12 testes MVC/JPA/PostgreSQL reais passaram; selo da baseline intacto |
| lint.mjs --app nas telas/componentes novos | 0 FAIL / 0 WARN |
| check-browser.mjs, build de produção com fixtures locais | teclado, arraste nativo desktop, criação, datas independentes, descarte, filtros e overflow passaram |
| inspect-all.mjs | 14 relatórios / 42 combinações, 0 FAIL; WARNs e exceções no registro visual |
| git diff --check | passou |

O PostgreSQL da prova foi criado em container descartável, com porta em loopback
para uso isolado e remoção em finally. Nenhum banco da aplicação foi resetado.
O teste novo foi incorporado à suíte existente; não há mecanismo paralelo de API.

Interações cobertas incluem modo simples inicial, objetivo opcional/removível,
criação sem datas artificiais, retry após timeout com mesma chave/payload,
conflito sem perder rascunho, transferência exigindo coluna/versões, planejamento
removido sem alterar prazo, conclusão manual, movimento pelo menu com filtro,
reordenação com todos os IDs e remoção de coluna ocupada com padrão obrigatório.
As caracterizações antigas por índice/PUT foram substituídas por esses contratos.

## Visual e limites

Mantidos Horizonte, Inter, creme/bordô e referência editorial-greeting,
seed 275775847, keep palette,type; sem novo sorteio, redraw ou entrance motion.
A pergunta é “qual o próximo passo deste projeto e onde executá-lo?”. A assinatura
é o mesmo trabalho entre objetivo, quadro e planejamento, sem duplicar Task.

[Registro visual, fixtures, relatórios e crítica APP SCREENS](../screenshots/projects-refactor/README.md#p4--telas-de-projetos).
Não há imagens externas, dados amostrais no produto nem conteúdo de prova a
substituir antes do lançamento.

O navegador usa API sintética em memória; a API real é provada separadamente pela
suíte PostgreSQL. Não se declara E2E completo navegador → API real, nem integração
visual de Hoje/semana: são P5/P6. A busca externa do Google Maps não foi exercitada
com credenciais reais. Não publicar este incremento isolado como release final.

RTK.md não estava na raiz ou nos pais verificados. A consulta ao CLI shadcn foi
impedida por DNS no sandbox; foram lidos e reutilizados os componentes Radix locais,
sem instalar/atualizar outra geração do shadcn.
