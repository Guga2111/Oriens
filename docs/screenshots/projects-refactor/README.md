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
node docs/screenshots/projects-refactor/p3/fixture-server.mjs oriens-front/dist 4175
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
node docs/screenshots/projects-refactor/p4/fixture-server.mjs oriens-front/dist 4183
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
