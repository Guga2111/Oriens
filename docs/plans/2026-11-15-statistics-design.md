# Estatísticas — desenho aprovado

Status: aprovado pelo usuário em etapas (hábitos em dias fixos; abordagem 2;
métricas; composição; interações e autorização de implementação). Data: 15/11/2026.

## Objetivo e diagnóstico

Responder constância, conclusão do planejamento, manutenção de hábitos, acúmulo
de pendências e resultado financeiro registrado. Não criar score de produtividade.
Git inicialmente limpo em 36169d2. RTK.md referenciado não localizado. Investigação:
StatisticsPage → useWorkStatistics → API → StatisticsController/WorkOwner →
StatisticsService → repositórios. Conclusões usam completedAt (LocalDate), agenda
usa plannedDate, prazo usa dueDate. Reabertura limpa completedAt; exclusão remove
tarefa; não existem eventos imutáveis ou snapshots de planejamento. Comparações
atuais usam mês/semana parcial contra períodos completos e exibem pp como %.
Gráfico omite dias sem conclusões. Não existe domínio de hábitos ou recorrência
de tarefas. Financeiro: amount numeric(12,2), receitas positivas, despesas negativas,
entryDate distinta da criação; sem pagamento confirmado nem saldo inicial. Listagem
paginada não é fonte de totais. Controller financeiro não valida principal contra
userId; filtros se sobrepõem em vez de combinar. Recorrência precisa de unicidade,
fuso Recife, calendário ancorado e recuperação prospectiva.

## Alternativas e direção

Foram comparadas visão integrada compacta, visão geral com aprofundamento e
calendário como navegação principal. Aprovada a segunda: calendário central,
planejamento/hábitos lado a lado e financeiro/categorias abaixo, com detalhes
contextuais. Não há grade de oito KPIs nem gráficos redundantes.

design-taste app screens: achromatic-ledger, seed 1359349889, keep palette,type.
Preservar shell, Inter, creme/vinho/amarelo, geometria e temas existentes. Exceções
às preferências neutras da skill são a identidade e os tokens já estabelecidos.
Sem gradientes, brilhos, ícones decorativos nos KPIs, animações de entrada ou
semântica automática de melhora por aumento. Usar componentes locais shadcn/Radix,
Calendar/Popover/Tooltip/Sheet/Progress/Empty/Alert/Skeleton e Recharts 2.15.4.
Nenhuma nova biblioteca de gráficos ou cópia de componentes locais.

## Métricas

P = intervalo inclusivo selecionado, limitado a hoje em America/Recife.
Q = intervalo imediatamente anterior, de igual quantidade de dias. Exibir datas;
hoje é parcial. Nunca atribuir melhora/piora automaticamente a comparação parcial.

| Nome | Pergunta | Fórmula | Fonte | Período | Limitação | Visual |
|---|---|---|---|---|---|---|
| Atividade diária | Quando houve realizações? | Tarefas CONCLUDED por completedAt + execuções válidas de hábitos | tarefas + execuções | 12 meses próprios | quantidade, não esforço/qualidade | calendário + detalhe |
| Dias com atividade | Em quantos dias houve registro? | dias com atividade > 0 | mesmas fontes | P | cobertura parcial explicitada | resumo |
| Tarefas concluídas | Quanto concluí? | CONCLUDED com completedAt em P | tarefas atuais | P | reabertura/exclusão recontam | total + barras no detalhe |
| Conclusão do planejamento | Quanto do previsto concluí? | dentre não canceladas com plannedDate em P: CONCLUDED com completedAt <= fim(P) / total | tarefas | P | plano atual, sem snapshot original | realizados/previstos + progresso |
| Aderência por hábito | Quais mantenho? | execuções / ocorrências programadas dentro da vigência, fora de pausas | novo domínio | P até hoje | hoje parcial; sem programação não é falha | matriz + barras |
| Atrasadas hoje | Onde acumulo pendências? | PENDING/ON_DOING com dueDate < hoje | tarefas atuais | hoje | estoque, sem delta histórico | por projeto e sem projeto |
| Financeiro registrado | Quanto entrou/saiu/resultou? | soma positivos; módulo negativos; diferença | lançamentos por entryDate | P | não é saldo disponível/pagamento | valores + barras agrupadas |
| Despesas por categoria | Onde concentro gastos? | módulo dos negativos por tag | mesmos lançamentos | P | classificação atual | barras horizontais |

Diferenças de contagem são absolutas; taxas usam pontos percentuais. Moeda BRL,
pt-BR, precisão decimal/centavos. Não calcular % relativo com base zero, ausente
ou resultado financeiro negativo. Sem população prevista, taxa indisponível,
nunca 0%. Totais, séries e detalhe devem reconciliar com seus escopos.

## Histórico e cobertura

Preservar semântica de tarefas: um ID contribui uma vez na conclusão vigente;
reabrir/cancelar retira, reconcluir move para nova data, repetir conclusão é
idempotente, excluir retira; edição de conteúdo/prazo não move conclusão.
Reagendamento/cancelamento alteram a população do planejamento. Avisar que são
recontagens do estado atual, não diário imutável/pontualidade histórica.
Registrar marco explícito de cobertura futura por domínio; não inferir pela
primeira tarefa sobrevivente. Registros anteriores podem mostrar contagem parcial;
ausência antiga é cobertura desconhecida, distinta de zero confirmado.

## Hábitos

Separados de tarefas. Cadastro com nome, dias fixos (inclusive diariamente), início
hoje/futuro e fim opcional. Uma execução por hábito/data, com unicidade física e
isolamento por dono. Registrar/desmarcar apenas em dia programado, dentro da
vigência, desde o cadastro e até hoje. Frequência muda a partir de amanhã,
preservando versões anteriores. Pausas a partir de hoje preservam dias anteriores;
arquivar mantém histórico e encerra expectativas futuras, incluindo hoje ainda
vigente. Matriz distingue realizado, pendente hoje, não realizado passado, pausa,
não programado e fora de vigência. Controle concorrente por versão, criação
idempotente. Cadastro/gestão/execução funcionais, sem aba vazia.

## Composição e controles

PageHeader com período global (7 dias, 30 dias padrão, mês atual, personalizado),
intervalo explícito, parcial, horário de atualização e recarregar. Calendário anual
em toda a largura, semanas segunda-domingo em colunas, meses, uma célula por dia.
Faixas fixas 0 / 1 / 2–3 / 4–6 / 7+. Unidade e decomposição tarefas/hábitos visíveis;
finanças não entram. Navegação própria anual explicitada, seleção não altera P.
Planejamento ~5/12 + hábitos ~7/12; financeiro ~8/12 + categorias ~4/12.
Detalhe de atividades traz volume diário/semanal; nenhum gráfico anual redundante.
Tablet empilha quando colunas ficam estreitas; celular 16px de margem, ordem
calendário/planejamento/hábitos/financeiro/categorias. Calendário e matriz rolam
internamente; calendário móvel com alvos 44px e navegação mês/data.

Tooltip: data completa, tarefas, hábitos, total, cobertura. Um tab stop na grade,
setas dias/semanas, Enter/Espaço seleciona. Seleção, foco e intensidade distintos.
Dia futuro não selecionável; sem cobertura consultável com explicação. Painel
Sheet contextual, largura total no celular, título e devolução de foco; alternativa
textual aos gráficos. Detalhe por completedAt, não endpoint da agenda planejada.
Listas extensas paginadas, agregados completos. Nenhum controle fictício.

## Dados, erros e mutações

Consultas independentes por domínio e chaves com usuário/intervalo/filtros/dia
relevantes; falha parcial não derruba tela. Agregado anual sem request por célula;
detalhe sob demanda. Mutação atualiza resumo/séries/dia; incluir mutações feitas
na tela Financeiro. Requests antigos não podem substituir novo escopo. Virada de
dia Recife atualiza intervalos. Validar principal no backend em todas as rotas
afetadas, incluindo categorias financeiras. Carregamento mantém geometria via
Skeleton; zero confirmado é número; inexistência/indisponibilidade são distintos.
Falha de refresh mantém dados válidos e horário; troca de P não rotula dados antigos
com novo intervalo. Salvamento confirmado seguido de refetch falho não vira falha
de escrita nem repete POST. Erros locais com tentativa real de recarregar.

## Recorrências e migração

Unicidade pai/data, execução atômica e relógio Recife. Original conta uma vez,
sem filho no início. Mensal e similares mantêm âncora e limitam dia ao último válido
(31/jan → 28/fev → 31/mar). Gerados são registros automáticos, não pagamentos
confirmados. Recuperar interrupções somente desde marco explícito do novo
processamento; não fabricar lacunas antigas nem mesclar/excluir duplicatas
silenciosamente. Validar precisão financeira. Migração aditiva explícita, com
checksum/seal, preflight e transação, seguindo ops/projects-refactor. Não alterar
baseline selada, resetar dados ou executar contra alvo compartilhado inferido.

## Referências e compatibilidade

- https://www.shadcn.io/ — biblioteca independente de ui.shadcn.com.
- https://www.shadcn.io/charts/heatmap-default — endereço solicitado não abriu;
  índice aponta https://www.shadcn.io/examples/heatmap-default.
- https://www.shadcn.io/charts/heatmap e https://www.shadcn.io/heatmap-chart-examples
  — semanas/meses/legenda/rolagem; versão atual usa TanStack Charts, somente referência.
- https://www.shadcn.io/charts/recharts/bar-multiple — consulta direta falhou;
  https://www.shadcn.io/charts/bar-multiple e /charts/recharts/bar confirmam barras
  agrupadas e APIs; adaptar à versão Recharts 2 instalada.
- https://www.shadcn.io/charts/recharts/bar-horizontal — ranking e nomes legíveis;
  acrescentar valores visíveis, sem dependência exclusiva de tooltip.
- https://www.shadcn.io/ui/radix/date-picker — página usa Ark apesar do rótulo;
  aproveitar seleção de intervalo via Calendar (day-picker 8) + Popover locais.
- https://github.com/shadcn-ui/ui/blob/main/LICENSE.md — MIT do shadcn/ui não
  implica mesma licença de shadcn.io. Documentação de charts shadcn.io informa
  uso pessoal/comercial gratuito, código requer conta. Não incorporar código dessa
  biblioteca; apenas referências de composição e interação.

## Prova e entrega

Capturar antes/depois em 1440/768/390, claro/escuro; executar inspect --app,
abrir capturas, criticar/corrigir principais problemas; gate visual final no build
de produção. Build e testes pertinentes: agregação e reconciliação, usuário,
mutações/cache, bordas de período/fuso, zero/base zero, dias não programados,
histórico de frequência/pausa e unicidade/âncora/recuperação financeira.
Testes PostgreSQL em banco descartável isolado, nunca reset de dev. Registrar
somente verificações executadas e impedimentos concretos. Documentar alterações,
definições/referências/evidências/limitações reais ao concluir.
