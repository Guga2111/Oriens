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
