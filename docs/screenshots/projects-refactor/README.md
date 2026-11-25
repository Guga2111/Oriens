# Projetos — evidências visuais P3

P3 modifica a compatibilidade de Todos os dados e o acesso às estatísticas;
editor/quadro e Hoje completo continuam P4/P5. Referência:
[entrega P3](../../plans/2026-11-13-projects-refactor-p3.md).

## Direção e inventário APP SCREENS

Mantidos Horizonte, Inter, creme/bordô e direção histórica editorial-greeting,
seed 275775847, keep palette,type. Sem novo sorteio ou redraw: a SPEC fixa esta
continuidade. Pergunta da tela: **quais tarefas/projetos tenho e como localizar
o conjunto que preciso?** A assinatura do produto são planejamento e prazo
independentes, com objetivos e tarefas contados sem inferir alcance.

Inventário usado antes da validação visual:

1. Tarefa tem identidade estável e três datas com trabalhos distintos.
2. Planejamento e prazo aparecem separados, inclusive quando um está ausente.
3. Ausência de horário é válida; não recebe horário artificial.
4. Cancelada permanece consultável, sem entrar no denominador não cancelado.
5. Projeto pode estar ativo ou arquivado; ambos podem contextualizar tarefas.
6. Objetivos têm conclusão manual; tarefa não conclui resultado.
7. A conta pessoal precisa buscar por título, projeto, prioridade e estado.
8. A lista é paginada; totais da página vêm do servidor.
9. Mobile precisa de filtros por toque e leitura sem truncar identidade.
10. O trabalho frequente é filtrar/encontrar; não é ler um hero ou assistir motion.

## Builds, fixtures e execução

[build.json](p3/build.json) identifica os hashes SHA-256 do build final.
O antes foi reconstruído com git archive do commit
593b7cb190621940c012a2ea38f28d18fb3b6d7d em diretório temporário.
Ambos usam Vite build de produção, servidos em loopback, sem API ou banco reais.

[fixture-server.mjs](p3/fixture-server.mjs) contém a conta sintética Demonstração,
o projeto Site pessoal e quatro tarefas: Montar formulário de contato, Revisar
navegação do portfólio, Publicar primeira versão e Comparar alternativas de
hospedagem (cancelada). Dados existem só no servidor de prova, nunca no produto.
O modo de referência omite CANCELLED porque o frontend anterior não sabe
renderizar esse enum; a primeira tentativa com o conjunto novo confirmou esse
erro. Portanto 3 tarefas no antes e 4 no depois não são comparação de desempenho.

[check-browser.mjs](p3/check-browser.mjs) usa um perfil temporário e dados locais;
não roda o globalSetup E2E que pode atingir outra API. Testou 1440/768/390,
reduced-motion, filtro Cancelada, troca de dateField com requisição observada,
busca de projeto, contagens de tarefas/objetivos, foco por teclado, ausência de
erro JavaScript e ausência de overflow horizontal da página. Passou.

Reprodução, a partir da raiz:

```bash
npm --prefix oriens-front run build
node docs/screenshots/projects-refactor/p3/fixture-server.mjs apps/client/dist 4175
# Em outro terminal:
node docs/screenshots/projects-refactor/p3/check-browser.mjs
node /Users/luisgosampaio/.agents/skills/design-taste-frontend/scripts/inspect.mjs --app http://127.0.0.1:4175/all-data --out docs/screenshots/projects-refactor/p3/after --allow palette-cream
```

O bootstrap de autenticação sintética só é inserido pelo fixture-server.
Não há senha de conta real, token de produção ou dados pessoais nos artefatos.

## Antes/depois e gate

| Medida | Antes | Depois |
| --- | --- | --- |
| H1 em 1440/768/390 | 24px, 1 linha | 24px, 1 linha |
| Fonte carregada | Inter 100% | Inter 100% |
| Campo temporal | Data, significando prazo | Planejada para + Prazo final + Horário |
| Estado CANCELLED | falha de renderização | lista e filtro próprios |
| Identidade mobile | truncada | quebra de linha |
| Tablet | tabela comprimida/rolagem interna | lista com campos preservados |
| Filtro de projeto | ausente | busca por nome, incluindo arquivados |
| Avanço de desenvolvimento | percentual genérico | contagens de objetivos/tarefas/canceladas |
| FAIL em 1440/768/390 | 0 com fixture compatível | 0 |

Relatórios: [antes](p3/before/report.json),
[depois tarefas](p3/after/report.json) e
[depois projetos](p3/projects-inspect/report.json).
As capturas fold e page de cada viewport foram abertas e examinadas; também
foram examinadas as capturas projects-1440/768/390.png do teste de interação.
As imagens page são folhas de contato do inspetor: a área cinza fora dos frames
não é overflow do produto.

Exceção pontual palette-cream: a SPEC determina a paleta Horizonte. Nenhuma
dispensa para contraste, foco ou legibilidade. WARN icon-chips no telefone:
os três ícones são controles neutros do shell/paginação, não indicadores ou
ícones decorativos em cards. O botão tem superfície/foco para comunicar ação
e preservar área de toque. A exceção não foi herdada de planos anteriores.

WARN heavy-borders também permanece em tarefas no tablet/celular: as divisórias
de registros têm aproximadamente 1,46:1. Mantidas para separar registros com duas
datas sem usar faixas alternadas ou boxes adicionais; é uma ressalva visual
explícita frente à recomendação de 1,3:1. Bordas externas foram suavizadas e a
sombra do card foi removida. Resultado final: tarefas 0 FAIL/2 WARN; projetos
0 FAIL/1 WARN. Nenhum WARN foi escondido do inspetor.

## Crítica final APP SCREENS

1. **Pergunta e leitura:** o título identifica a tela e a lista ocupa a região
   principal. Filtros localizam o conjunto; não há hero nem métricas ornamentais.
2. **Geometria:** margens simétricas, contêiner usado até a borda disponível.
   Títulos longos quebram no telefone; tablet usa lista em vez de esmagar colunas.
3. **Cor:** creme/bordô preservam identidade; cor dos estados acompanha seu
   rótulo. Superfícies são planas; sem imagens decorativas ou entrance motion.
4. **Contagens:** quatro tarefas no conjunto novo, uma cancelada; três não
   canceladas, zero concluídas. Projetos mostra 0/3 tarefas e uma cancelada.
   Zero objetivos diz Nenhum objetivo definido, sem porcentagem inventada.
5. **Zeros/ausências:** datas/horário ausentes aparecem como traço/Sem horário;
   nenhuma hora é inventada. Totais e paginação vêm da mesma resposta.
6. **Legendas e colisões:** não há gráfico nesta tela; rótulos de data são
   explícitos. A descrição desktop passou para a identidade da tarefa para
   reservar medida às datas; textos dos filtros foram alargados.
7. **Telefone:** navegação recolhida, filtros em sheet e projeto pesquisável;
   ação e campos preservados. Navegação de foco sem prender o teclado.

Foram corrigidos os três problemas mais relevantes da primeira captura:
título cortado, tabela comprimida no tablet e rótulos truncados nos seletores.
A aba Projetos recebeu a mesma adaptação do tablet. Avaliação pelas sete
perguntas de APP SCREENS, sem aplicar a nota/caps de uma landing page.

Limites: esta prova é navegador + API sintética; a API real é exercitada pela
suíte MVC/JPA/PostgreSQL. Sem claim de E2E completo quadro→Hoje, de edição móvel
do quadro, de inspeção exaustiva escura ou de inspeção visual da tela de
Estatísticas. Essas verificações continuam nas etapas P4–P6. Não há fotografias,
clipes, ilustrações ou conteúdo amostral a substituir no produto.

# P4 — telas de projetos

Entrega: [P4](../../plans/2026-11-13-projects-refactor-p4.md).

## Direção, inventário e perguntas

Continuidade de Horizonte: Inter, creme/bordô, editorial-greeting,
seed 275775847, keep palette,type. A SPEC fixa a direção; não houve sorteio,
redraw, fotografias externas, gráficos inventados ou animação de entrada.
A identidade aparece no shell Oriens, na cor opcional do projeto e no trabalho
real: objetivos manuais ligados a tarefas com planejamento independente do prazo.

Inventário específico aplicado antes da implementação:

1. Projeto pessoal tem modo Simples ou Desenvolvimento e um único proprietário.
2. Objetivos têm IDs, prazos opcionais e conclusão manual.
3. Tarefas têm um ID entre quadro, editor e agenda.
4. Colunas têm nomes independentes do significado e dois destinos padrão.
5. Data planejada, horário e prazo final são campos diferentes; todos podem faltar.
6. Planejamento anterior não é prazo ultrapassado.
7. Canceladas permanecem consultáveis e não entram no denominador não cancelado.
8. Conta nova pode ter apenas um projeto ou um quadro sem tarefas.
9. Contagens gerais vêm do backend; filtros mostram o conjunto visível sem alterar ordem oculta.
10. Ações frequentes são adicionar objetivo/tarefa, mover, planejar e concluir.
11. Versões e chaves de criação são precondições de escrita, sem atualização otimista persistente.
12. Celular precisa de seletor de coluna, menus e formulários roláveis.

Pergunta por tela: Projetos — “qual contexto retomar?”; Simples — “qual resultado
falta alcançar?”; Quadro — “qual tarefa executar ou mover?”; Objetivos — “que
trabalho contribui para este resultado?”; Editor — “o que fazer, quando executar
e qual o prazo?”; Configuração — “onde as tarefas ficam e quais destinos usar?”.
A ação principal é visível na primeira tela; filtros/ações secundárias recolhem
no celular. O elemento característico é a mesma tarefa entre objetivo e quadro,
com duas datas explicitamente distintas no editor.

## Artefatos e reprodução

- [Build final e hashes SHA-256](p4/build.json).
- [Fixtures sintéticas em memória](p4/fixture-server.mjs).
- [QA de interação e capturas](p4/check-browser.mjs) e [resultado](p4/browser-results.json).
- [Matriz do inspetor](p4/inspect-all.mjs) e [resultados](p4/inspection-results.json).
- [Antes, build preservado](p4/before/report.json).
- [Projetos claro](p4/final/projects-light/report.json), [escuro](p4/final/projects-dark/report.json).
- [Simples claro](p4/final/simple-light/report.json), [escuro](p4/final/simple-dark/report.json).
- [Quadro claro](p4/final/board-light/report.json), [escuro](p4/final/board-dark/report.json).
- [Objetivos claro](p4/final/objectives-light/report.json), [escuro](p4/final/objectives-dark/report.json).
- [Criação clara](p4/final/create-light/report.json), [escura](p4/final/create-dark/report.json).
- [Editor claro](p4/final/editor-light/report.json), [escuro](p4/final/editor-dark/report.json).
- [Configuração clara](p4/final/settings-light/report.json), [escura](p4/final/settings-dark/report.json).

O antes usa o build copiado antes das edições, do commit e141a0c938b6e51898eb0f23bd60e7439059928f.
A captura inicial foi refeita com paginação correta da fixture: o envelope da
fixture antiga não tinha last e provocava repetição artificial dos mesmos cards.
O adapter de referência fornece progress/totalObjectives ao DTO antigo; o novo
build usa apenas summary. Não se compara desempenho ou quantidade de cards
com a captura inicial defeituosa.

A fixture contém três projetos: Site pessoal, com sete colunas e seis tarefas;
Aprender fotografia, simples com dois objetivos; Ideias para escrever, quadro
vazio. Há títulos longos, objetivo sem prazo, tarefa sem objetivo/planejamento,
planejamento anterior, prazo ultrapassado, hoje com/sem horário, cancelada e
concluída. Site pessoal tem 0/2 objetivos e 1/5 tarefas não canceladas concluídos,
mais uma cancelada; fotografia tem 1/2 objetivos. As contagens são calculadas.
Nada dessa conta sintética é incluído no produto ou enviado para um serviço externo.

```bash
npm --prefix oriens-front run build
node docs/screenshots/projects-refactor/p4/fixture-server.mjs apps/client/dist 4183
# Outro terminal, a partir da raiz:
node docs/screenshots/projects-refactor/p4/check-browser.mjs http://127.0.0.1:4183
node docs/screenshots/projects-refactor/p4/inspect-all.mjs http://127.0.0.1:4183
```

Rodar os dois últimos comandos em sequência: o QA de interação altera/restaura
somente os objetos em memória das fixtures. Não usa globalSetup E2E nem API real.
O bootstrap de autenticação e os parâmetros qa de abertura de modais existem
apenas no fixture-server, fora do código do produto.

## Medidas, exceções e comparação

Gate final: **14 relatórios, 42 combinações de viewport, 0 FAIL e 21 WARN agrupados**, com as exceções pontuais descritas abaixo.

O inspetor verifica sete estados nos dois temas em 1440, 768 e 390 px; o QA
acrescenta 360/1024, fuso Pacific/Auckland e reduced-motion. Fonte Inter carregada,
títulos 24 px, sem overflow horizontal de página ou erros JavaScript no roteiro.
Campos e Salvar do editor móvel foram medidos com pelo menos 44 px de altura.
As capturas editor-bottom/settings-bottom mostram o fim dos corpos roláveis.

| Antes | Depois |
| --- | --- |
| Cards com objetivos por índice e percentual genérico | Modo, contagens explícitas e próximo passo vindos do servidor |
| Objetivo sem identidade durável no cliente | ID e versão em cada operação |
| PUT integral de projeto/tarefa | PATCH específico, sem substituir coleções ou reposicionar edição de texto |
| Sem quadro/editor de desenvolvimento | Quadro, objetivos vinculados, configuração e editor compartilhado |
| Controles móveis empurravam tarefas para baixo | Menu do projeto, filtros em Drawer e seletor de coluna |
| Horário/data exigidos no formulário antigo | Planejamento/horário/prazo opcionais e independentes |
| Ícone nativo de data escuro sobre fundo escuro | color-scheme do tema aplicado aos controles nativos |

A paleta Horizonte justifica somente palette-cream, determinada pela SPEC.
Nos três modais, e apenas neles, covered-text/heavy-shadow são dispensados: um
modal real cobre o título da página de fundo e usa a sombra de superfície flutuante
permitida pela skill. O inspetor instalado trata o título inerte e essa sombra
como se fossem conteúdo de página. As capturas confirmam os modais abertos; não
foi medida apenas a página subjacente. Contraste e legibilidade não têm dispensa.

WARNs foram avaliados por região:

- icon-chips: botões neutros reais de menu, calendário e conclusão manual, com
  nome/foco/estado; não são ícones decorativos repetidos em indicadores.
- ragged-row: tarefas de Kanban têm textos/datas diferentes; igualar alturas
  adicionaria vazio. No simples, lista principal e resumo/calendário são regiões
  com papéis distintos e alinhadas pelo topo, não cards de métricas pares.
- tabular: alerta do calendário do simples, cujas datas ocupam células de largura
  fixa. A página usa tabular-nums para suas contagens; não há colunas financeiras.
- heavy-borders: algumas separações herdadas de Horizonte chegam a cerca de
  1,45:1. Mantidas como ressalva de densidade, sem adicionar sombras em repouso.
- panel-void: o card simples pode ficar menor que seu vizinho de desenvolvimento;
  apenas as ações permanecem no rodapé comum. O próximo passo fica junto às
  contagens, sem ser empurrado para o fim de um painel vazio.

## Crítica final APP SCREENS

1. **Pergunta e primeira leitura:** nome/modo e próximo passo orientam Projetos;
   o quadro ocupa a região principal do desenvolvimento. Simples conserva a lista
   de objetivos. Não há hero, saudação ornamental ou estatística de produtividade.
2. **Geometria e densidade:** margens compartilhadas, duas colunas de cards com
   medida suficiente, uma em conta/filtro com card único. Sete colunas rolam dentro
   do quadro; no celular apenas a escolhida aparece. O editor mantém rodapé fixo
   com Salvar/Cancelar e corpo rolável até 90dvh.
3. **Cor:** identidade creme/bordô preservada. Vermelho fica em pendências reais;
   contagens de atenção zeradas foram retiradas. Datas nativas seguem o tema.
4. **Contagens:** Site pessoal tem seis tarefas, cinco não canceladas e uma
   concluída: 1/5, com uma cancelada separada. Objetivos continuam 0/2, sem inferir
   conclusão a partir das tarefas. Filtros mudam contagens visíveis, não o geral.
5. **Zeros e ausências:** quadro vazio mantém colunas e Adicionar; zero objetivos
   não recebe percentual. Sem objetivo, planejamento, horário ou prazo são estados
   válidos. Criar no quadro não injeta uma data/horário artificiais.
6. **Rótulos e controles:** significado aparece separado do nome da coluna;
   planejamento e prazo têm rótulos/remover próprios. A remoção mostra estado de
   destino e quantidades antes da confirmação. Menus fornecem alternativa ao drag.
7. **Telefone:** shell recolhido, uma coluna por vez, filtros secundários recolhidos,
   alvos do editor com 44 px e sem corte de identidade. Criar/mover/cancelar
   rascunho funciona por teclado. Nomes longos quebram sem rolar a página de lado.

Principais correções das rodadas: excesso de controles acima das tarefas móveis;
sinais de atenção com zeros; contraste dos ícones nativos e altura dos controles.
A avaliação segue as sete perguntas de APP SCREENS, sem nota/caps de landing page.
Capturas foram examinadas em folhas de contato e ampliadas nas regiões de leitura,
editor e telefone; a área cinza das folhas do inspetor é externa ao produto.

Limites: navegador com API sintética, API real em teste PostgreSQL separado,
sem prova ponta a ponta do produto completo ou busca externa Google Maps com
credenciais reais. Hoje/semana e liberação operacional continuam P5/P6.

## P5 — Hoje integrado

Mantidos Horizonte, Inter, creme/bordô, editorial-greeting, seed **275775847**,
keep palette,type. Nenhum redraw. Pergunta: **o que está planejado e o que preciso
replanejar ou concluir?** Ideia: o mesmo ID de tarefa do quadro se torna a linha
do planejamento diário, com prazo independente. O elemento interativo é a faixa
do dia que leva à tarefa; as marcas coincidentes abrem os IDs correspondentes.

Inventário: tarefa com/sem horário; três períodos; objetivo opcional; coluna
canônica; tarefa avulsa; prazo hoje/ultrapassado; planejamento futuro; pendência
anterior; concluída recolhida; cancelada fora do trabalho ativo; projeto arquivado;
mesmo relógio de Recife. Os blocos respondem, nessa ordem: planejado hoje, em que
período, o que foi concluído, o que ficou de outro dia e qual prazo exige atenção.

### Artefatos e reprodução

- [Antes](p5/before/report.json): captura da árvore local encontrada, já com as
  leituras DayResponse/RangeResponse em andamento. Mesmo dataset sintético do depois;
  a ausência de Sem horário/recuperação era o comportamento dessa composição.
- [Fixture isolada](p5/fixture-server.mjs): nove tarefas ilustrativas em memória;
  nenhuma entra no produto. Três planejadas ativas hoje, uma concluída hoje, uma
  pendência anterior, duas em atenção, uma sem datas e uma cancelada. Um objetivo
  e uma tarefa têm títulos longos. O total da lista planejada é quatro, não nove.
- [Interações/capturas](p5/check-browser.mjs) e [resultados](p5/browser-results.json).
- [Gate final](p5/inspection-results.json): dia/semana, claro/escuro, três larguras;
  relatórios e todas as capturas ficam em `p5/final/`.
- [Jornada real](p5/live-browser.mjs): acionada pelo WorkApiPostgresTest em HTTP
  aleatório com PostgreSQL descartável. Sem usar globalSetup nem banco da aplicação.
- [Build](p5/build.json): hashes dos arquivos finais de produção.

```bash
VITE_API_BASE_URL=/api npm --prefix oriens-front run build
node docs/screenshots/projects-refactor/p5/fixture-server.mjs apps/client/dist 4185
# Em outro terminal; executar interações antes da inspeção, mantendo a fixture estável:
node docs/screenshots/projects-refactor/p5/check-browser.mjs
node docs/screenshots/projects-refactor/p5/inspect-all.mjs
python3 oriens-api/ops/projects-refactor/test_p2.py --browser
```

O modo live da fixture encaminha somente task/project à API descartável. JWT de
QA é efêmero e fornecido por ambiente pelo teste; nenhum token real é armazenado
nos artefatos. Perfil/preferências/notificações do shell continuam sintéticos.

### Crítica APP SCREENS

ROUND 1
Seen in one second: Hoje e faixa preservados; contexto completo, porém linha apertada no tablet.
Idea (one sentence): o mesmo trabalho do quadro ocupa a linha diária sem duplicar tarefa.
Live thing: marcas por horário e menu com foco na linha.
Layout words by section: título=ações / faixa=períodos / planejamento=listas / recuperação=listas.
Scores: design 7 · usability 7 · creativity 7 · content 8 → overall 7.1.
Caps applied: regras APP SCREENS; sem pisos de imagens ou entrance motion.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. day-light/tablet-fold: hora/identidade/prioridade comprimem a linha; concentrar metadados abaixo do título.
2. day-light/desktop-fold: agora encosta em Manhã; levar o rótulo à base da faixa.
3. week-light/desktop-fold: contexto só usa o centro estreito do cartão; usar sua largura inteira.

ROUND 2
Seen in one second: dia legível; semana ainda longa e cartões estreitos.
Idea (one sentence): planejamento e prazo continuam independentes em cada superfície.
Live thing: conclusão retira a linha da lista ativa e a mantém na seção recolhida.
Layout words by section: dia=linhas / semana=colunas ou agenda / atenção=linhas com motivo.
Scores: design 7.3 · usability 7.5 · creativity 7 · content 8 → overall 7.4.
Caps applied: regras APP SCREENS.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. week-light/desktop-page-01: campos quebram palavra a palavra; ampliar largura mínima das colunas e tirar a data planejada redundante com o cabeçalho do dia.
2. week-light/mobile-page-01: seis dias vazios empurram sábado; pôr Sem tarefas ao lado do dia e compactar espaçamento.
3. day-light/mobile-page-01: contagem quebra em duas linhas; reservar sua largura.

ROUND 3
Seen in one second: Hoje mostra trabalho e motivo; semana preserva calendário com rolagem interna.
Idea (one sentence): o ID persistente conecta quadro, horário e linha diária; prazo não vira agenda.
Live thing: menu de marcas coincidentes, planejamento e conclusão confirmados pelo servidor.
Layout words by section: título=ações / faixa=tempo / dia=grupos / concluídas=disclosure / semana=agenda ou colunas.
Scores: design 7.5 · usability 8 · creativity 7 · content 8 → overall 7.6.
Caps applied: regras APP SCREENS; sem métricas/imagens decorativas inventadas.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. week-light/desktop-fold: semana quase vazia gera um campo vazio real. A grade passa a manter o dia selecionado visível na rolagem interna, sem preencher os dias vazios com tarefas de atenção ou dados inventados.
2. tablet-fold: shell existente ainda ocupa 256px em 768px. A lista foi adaptada ao espaço; mudança global do breakpoint do shell fica para P6.
3. week-light: bordas dos cartões existentes continuam mais fortes que a recomendação; ressalva abaixo.

### Gate e ressalvas

Zero FAIL nas quatro inspeções finais (12 combinações). Dia claro/escuro: um WARN
icon-chips, dos três controles neutros do shell. São botões reais de navegação,
não ícones decorativos de métricas. Semana clara: hero-void, heavy-borders e
icon-chips; escura: hero-void e icon-chips. O vazio corresponde aos dias sem tarefa;
não é preenchido artificialmente. As bordas de TaskChip são as divisórias do
sistema Horizonte, ~1,45:1; permanecem um ponto de refinamento visual para P6.
Exceção de paleta limitada a palette-cream, exigida pela SPEC. Nenhuma dispensa de
contraste, foco ou legibilidade. Lint: 0 FAIL, um WARN referente a “06” na régua real,
que é dado de horário obrigatório, não numeração decorativa.

As capturas fold/page de todos os relatórios finais foram abertas. Sem imagens ou
clips externos, sem créditos a acrescentar e sem dados de exemplo no produto.
Os dados sintéticos são exclusivos dos testes; não há conteúdo de prova a trocar
no lançamento. P6 ainda cobre a inspeção global e a liberação operacional.

## P6 — inspeção e preparação de liberação

[Entrega P6](../../plans/2026-11-13-projects-refactor-p6.md) ·
[runbook/checkpoint](../../../ops/projects-refactor/RELEASE.md).
O release real depende de alvo, autorização destrutiva e backup/restore desse alvo.
Nenhum banco compartilhado foi resetado e nenhum deploy foi executado.

### Direção, perguntas e escopo visual

Mantidos Horizonte, Inter, creme/bordô, **editorial-greeting, seed 275775847**,
keep palette,type. Sem redraw: o produto tem design aprovado. A face permanece
no shell Oriens, na cor dos projetos e nas duas datas independentes; assinatura:
**o mesmo ID de tarefa se torna cartão do quadro, linha de Hoje e marca da timeline**.
O elemento interativo continua levando da faixa de horário à tarefa, inclusive
marcas coincidentes. Sem fotos/clipes externos, créditos ou amostras no produto.

As perguntas das nove telas/estados continuam: Projetos — qual contexto retomar;
Simples — qual resultado falta; Quadro — qual tarefa executar/mover; Objetivos —
qual trabalho contribui; Criação — qual modo; Editor — o que/quando/prazo;
Configuração — onde posicionar; Hoje — o que fazer/replanejar; Semana — quando
executar. Não houve novo hero, métricas ornamentais ou animações de entrada.

Inventário preservado: projetos simples/desenvolvimento; objetivos manuais com ID;
sete colunas customizadas; tarefa com/sem objetivo; agenda e prazo independentes;
com/sem horário; pendência anterior; atenção ao prazo hoje e planejamento futuro;
concluídas; canceladas; quadros/dias vazios; títulos longos; teclado/toque.

### Evidências e reprodução

- [Manifesto de build e hashes](p6/build.json), [verificação consolidada](p6/verification.json).
- [Antes de editar](p6/before/report.json): Hoje em build de produção, 14/11.
- [Matriz final](p6/inspection-results.json) e [script](p6/inspect-all.mjs).
- [Projetos: roteiro reaproveitado](p4/check-browser.mjs), [resultado P6](p6/projects/browser-results.json).
- [Hoje/semana: roteiro reaproveitado](p5/check-browser.mjs), [resultado P6](p6/planning/browser-results.json).
- [Estados/teclado/conflito](p6/check-states.mjs), [resultado](p6/states/results.json).
- [Jornada real adicional](p6/live-browser.mjs): arquivar → Hoje → concluir →
  preview/excluir projeto → mesma tarefa avulsa. Invocada por WorkApiPostgresTest,
  após a jornada P5, em banco descartável com HTTP/JWT/JPA reais.

Reprodução a partir da raiz, com dependências/navegador já instalados:

```bash
VITE_API_BASE_URL=/api npm --prefix oriens-front run build
node docs/screenshots/projects-refactor/p4/fixture-server.mjs apps/client/dist 4194
# Outro terminal:
node docs/screenshots/projects-refactor/p5/fixture-server.mjs apps/client/dist 4196
# Terceiro terminal; rodar interações antes de inspecionar:
node docs/screenshots/projects-refactor/p4/check-browser.mjs http://127.0.0.1:4194 docs/screenshots/projects-refactor/p6/projects
node docs/screenshots/projects-refactor/p5/check-browser.mjs http://127.0.0.1:4196 docs/screenshots/projects-refactor/p6/planning
node docs/screenshots/projects-refactor/p6/check-states.mjs
node docs/screenshots/projects-refactor/p6/inspect-all.mjs
python3 oriens-api/ops/projects-refactor/test_p0.py
python3 oriens-api/ops/projects-refactor/test_p1.py
python3 oriens-api/ops/projects-refactor/test_p2.py --browser
```

As fixtures são exclusivamente locais/em memória, conta Demonstração, email
example.invalid, sem dados pessoais. P4 tem Site pessoal (6 tarefas), Aprender
fotografia (2 objetivos) e Ideias para escrever (vazio). P5 acrescenta três tarefas:
quatro no planejamento de hoje (uma concluída), uma pendência anterior, duas em
atenção, uma sem datas e uma cancelada. As contagens vêm das linhas. Estados
adicionais são projeções interceptadas apenas no navegador dessa prova; não alteram
persistência. Só canceladas também atualiza o resumo do projeto, sem denominador ativo.

A primeira fixture de Hoje permaneceu aberta durante a mudança de 14 para 15/11;
o roteiro falhou corretamente porque suas tarefas ficaram no dia anterior.
Foi fixado o relógio sintético à inicialização do servidor (somente modo fixture),
e Hoje/semana foram recapturados em 15/11. Não se compara data/posição de “agora”
entre os dias como se fossem regressões. O modo live usa relógio fixo do teste real
em Recife e dispositivo Pacific/Auckland. Não usar globalSetup contra API compartilhada.

### Antes/depois e gate

| Medida | Antes P6 | Final P6 |
| --- | --- | --- |
| Sidebar em 768/1024 | 256 px persistentes | recolhida em Sheet, título acessível e navegação por teclado |
| Conteúdo de Hoje em 768 | 464 px úteis após margens | 720 px úteis após margens |
| Header | transparência/backdrop blur | superfície opaca do tema |
| TaskChip | borda integral do tema | borda com 60% do token |
| Faixa do dia, períodos e foco | presentes | preservados; clique/teclado e coincidências passando |
| Editor móvel | rodapé fixo e corpo rolável | preservados, inclusive fim dos campos/configuração |
| Inspetor APP SCREENS | Hoje: 0 FAIL / 1 WARN | 18 relatórios / 54 combinações: 0 FAIL / 30 WARN agrupados |

O QA de interação cobre **1440/768/390/360/1024 nos dois temas**, sem erros JS
ou overflow de página nos roteiros. Os gates medem 1440/768/390 em nove estados,
claro/escuro. Foram abertas e examinadas **todas as capturas finais listadas pelo
inspetor**, agrupadas em folhas de contato por estado/tema, além de ampliações de
tablet, telefone e fins roláveis de editor/configuração. As áreas cinza das folhas
são externas ao produto. O screenshot privado original da timeline não está neste
checkout; usou-se a referência preservada em P5 e a faixa real atual.

Exceções passadas ao inspetor são delimitadas: palette-cream corresponde à marca
fixada pela SPEC; covered-text/heavy-shadow somente nos três modais, porque eles
cobrem o título inerte da página e têm uma superfície flutuante real. Não há
exceção de contraste, fonte, foco ou overflow.

Todos os WARNs finais foram revistos por região, sem dispensas automáticas:

- **icon-chips**: Hoje/semana e objetivos alertam para controles neutros reais do
  shell e conclusão manual, com nome/foco/estado, sem ícones decorativos de KPI.
- **ragged-row**: quadro tem cartões de tarefas com tamanhos de conteúdo distintos;
  simples tem lista e resumo/calendário com funções diferentes. Editor/configuração
  também medem a página de fundo com esses mesmos cartões. Forçar alturas iguais
  criaria vazio sem melhorar a relação entre registros.
- **tabular**: calendário do simples distribui datas em células fixas; as contagens
  da tela usam tabular-nums. Não há coluna de valores que precise alinhar decimais.
- **panel-void**: projetos mantém ações no rodapé entre cards com quantidades de
  informação diferentes; o vazio do card simples reaparece no fundo da criação.
  Próximo passo fica junto às contagens, sem ser empurrado artificialmente.
- **heavy-borders**: claro ainda tem divisórias ~1,45–1,46:1 em cartões do quadro,
  projetos e linhas semanais. Mantidas como separação do sistema atual, sem sombra
  adicional; a borda de TaskChip foi suavizada, mas o restante não virou redesign
  global. Ressalva visual frente ao alvo de 1,3:1, sem dispensar contraste de texto.
- **hero-void**: semana com quatro tarefas concentradas em domingo tem dias vazios
  reais. Preservar a geometria do calendário é preferível a inserir trabalho fictício
  ou repetir atenção nos demais dias. Tablet/telefone usam agenda compacta.

Lint de design: 0 FAIL / 4 WARN no sidebar compartilhado — sombras de variantes
floating/inset/outline que este shell não usa e transition-all do rail herdado.
O layout inspecionado não tem sombra de painel em repouso nem vidro no header.
ESLint: 0 erros, aviso de Fast Refresh porque sidebar exporta componentes e hook.
Build mantém avisos de bundle grande, Browserslist e classe duration ambígua.

### Crítica final APP SCREENS

ROUND 1 — referência P5 / antes P6
Seen in one second: Hoje é reconhecível, mas a navegação toma um terço do tablet.
Idea (one sentence): um ID conecta contexto do projeto à execução sem converter prazo em agenda.
Live thing: faixa do dia e menus de tarefa com foco/feedback.
Layout words by section: shell=navegação / título=ações / faixa=tempo / tarefas=grupos.
Scores: design 7.5 · usability 7.5 · creativity 7 · content 8 → overall 7.5.
Caps applied: APP SCREENS, sem pisos de imagens/motion.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. before/tablet-fold: sidebar fixa comprime o trabalho; recolher antes de 1100 px, com hook e CSS coerentes.
2. before/desktop-fold: header de vidro contraria superfícies planas; usar fundo opaco do tema.
3. p5/week-light: cartões com contornos fortes; suavizar TaskChip com token existente e explicitar limites do restante.

ROUND 2 — final P6
Seen in one second: projeto/quadro e planejamento têm prioridade; tablet usa a largura disponível.
Idea (one sentence): o cartão, a linha do dia e a marca de horário representam o mesmo trabalho confirmado pelo servidor.
Live thing: mover por menu, planejar, concluir e levar foco da marca à tarefa, sem dependência de drag.
Layout words by section: projetos=contextos / simples=resultados / quadro=colunas / objetivos=contribuições / editor=datas / Hoje=grupos / semana=calendário.
Scores: design 7.7 · usability 8 · creativity 7 · content 8 → overall 7.7.
Caps applied: APP SCREENS; exceções pontuais dos modais e paleta documentadas.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. final/week-light/desktop-fold: semana com dias vazios continua esparsa; mantida sem preencher dados ou alterar o calendário aprovado.
2. final/board-light/tablet-fold: sete colunas requerem rolagem interna; preservada identidade das tarefas e alternativa móvel por coluna.
3. final/editor-light/mobile-fold: o formulário é longo; corpo rola e rodapé Salvar/Cancelar permanece visível, fim inspecionado em projects/editor-bottom-*.

1. **Pergunta:** a região principal contém os contextos, tarefas ou resultados da
   tela. Nova tarefa/mover/concluir estão junto ao trabalho, sem hero de marketing.
2. **Geometria:** tablet agora tem medida útil; margens do conteúdo consistentes;
   quadro/semana rolam internamente; modais mantêm ações e rolagem de formulário.
3. **Cor:** a marca permanece; estado/prazo têm texto explícito. Header opaco,
   superfície dos cartões sem novos efeitos. Não se acrescentou paleta de gráficos.
4. **Contagens:** P4 tem 1/5 tarefas não canceladas e uma cancelada; objetivos 0/2.
   P5 planeja quatro hoje, uma concluída; recuperação/atenção não aumentam esse total.
5. **Zeros/ausências:** dia/quadro vazios mantêm estrutura e ação; só canceladas
   diz Nenhuma tarefa ativa, sem 100%; ausência de hora/prazo não vira valor fictício.
6. **Rótulos/foco:** duas datas independentes; significados das colunas nomeados;
   409 mantém rascunho e pede revisão explícita após recarregar. Timeline coincidente
   leva ao ID correto. Menu recolhido tem título acessível e fecha ao navegar.
7. **Telefone:** sem overflow horizontal da página em 360/390; uma coluna de quadro;
   agenda semanal vertical; campos e rodapé acessíveis até o fim da rolagem.

As notas são avaliação visual subjetiva, não métricas de produtividade. Persistem
as ressalvas listadas; não foram ocultadas do gate. Não há conteúdo de demonstração
para trocar no lançamento: fixtures, screenshots e falhas simuladas só vivem no QA.
