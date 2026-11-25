# Redesenho do Financeiro e carteira manual

Especificação funcional de 25/11/2026 para o objetivo #8 do projeto Oriens, “Financeiro: acompanhamento de investimentos (registro manual, sem Open Finance)”. As decisões de produto da primeira versão foram confirmadas na revisão do protótipo. A aprovação do texto consolidado encerra a tarefa #116.

Abra o [protótipo navegável](prototypes/financeiro.html) no navegador. Os lançamentos e aplicações são fictícios. Recarregar a página restaura o cenário inicial.

## O que já funciona

O [Financeiro](../../apps/client/src/pages/FinancialPage.tsx) oferece navegação mensal, resumo de receitas e gastos, saldo acumulado, gráficos por categoria, histórico paginado e gestão de tags e recorrências. “Nova entrada” é a ação principal. O histórico tem filtros próprios de período, categoria e busca. As escritas do fluxo atual têm precondições de versão e idempotência.

A página monta hoje os indicadores a partir de páginas de lançamentos, com carregamento inicial e complementação posterior. A [agregação da API](../../apps/api/src/main/java/com/oriens/oriens_api/service/FinancialStatisticsService.java) já calcula valores por período, série diária e gastos por categoria. Antes de escolher a fonte da nova visão, conferir se a agregação disponível atende também ao acumulado e à navegação para meses futuros. Os cards e gráficos precisam de totais completos e da indicação de erro quando o cálculo estiver indisponível.

## Escopo da primeira versão

- **Visão geral.** O mês selecionado orienta os indicadores e a composição de gastos. Ao selecionar uma categoria, o histórico abre com o mês e a categoria aplicados. O saldo disponível inclui as transferências de investimentos e indica o intervalo acumulado que representa.
- **Lançamentos.** Histórico paginado com busca, período e categoria. Ação manual fácil de acessar e gestão das tags e recorrências no fluxo atual de trabalho. Aportes e resgates aparecem como transferências. Rendimentos recebidos aparecem como receita. Os três movimentos recebem automaticamente a tag predefinida Investimentos.
- **Investimentos.** Carteira em uma área própria do Financeiro. Cada aplicação tem uma posição baseada na última avaliação, ajustada por aportes e resgates posteriores. O usuário pode começar com uma posição que já existe, consultar o histórico de avaliações e registrar aportes, resgates e rendimentos recebidos manualmente.

A implementação no app usa os componentes shadcn e os tokens atuais do Oriens. O protótipo demonstra os caminhos de registrar uma despesa, investigar uma categoria e consultar ou atualizar uma posição manual no desktop e no celular. O plano segue a restrição de trabalhar sem Open Finance.

## Cadastro e indicadores

O cadastro pede quatro campos obrigatórios. O usuário informa **nome da aplicação, classe, valor atual em reais e data da avaliação**. As classes do protótipo são Renda fixa, Ações, Fundos imobiliários e Outros. Para uma aplicação que o usuário já possui, esse valor estabelece a posição inicial sem movimentar o caixa. Exemplo: ao cadastrar CDB Inter, classe Renda fixa, R$ 1.000,00 em 25/11/2026, esses R$ 1.000,00 entram no valor da carteira. Quando o usuário investe dinheiro do caixa, registra um Aporte.

Foram consideradas três abordagens para a carteira. A posição por data tem menos campos, mas perde o histórico de fluxos. Reconstruir a carteira operação por operação exige quantidade, custo, preços e tratamento de eventos. A primeira versão combina posições por data com movimentos manuais para acompanhar caixa e carteira sem reconstruir todo o histórico.

A primeira versão apresenta posição atual, aportes líquidos, rendimentos recebidos, composição e histórico de avaliações. O indicador de valorização em reais fica para depois, assim como a definição de rentabilidade calculada, cotação automática e importação. Limites por categoria, projeções e cartão ficaram fora deste backlog porque a prioridade escolhida foi carteira manual com revisão da tela atual.

## Regras de cálculo e lançamento

- Resultado do mês é receita menos despesa daquele mês. Saldo disponível é o acumulado até o fim do mês escolhido, com receitas, despesas e transferências de investimento. O total da carteira soma as posições e fica disponível na aba Investimentos.
- Cada posição parte da última avaliação e inclui os aportes e resgates posteriores. Movimentos do mesmo dia entram quando registrados depois da avaliação. A tela identifica quando a posição é estimada e indica a data da última avaliação por aplicação.
- Exemplo sintético de caixa. R$ 4.000,00 de receitas e R$ 2.500,00 de despesas no mês produzem R$ 1.500,00 de resultado. A lista pode exigir várias páginas, com o mesmo total.
- Exemplo sintético de carteira. Após uma avaliação de R$ 15.000,00, um resgate de R$ 2.000,00 ajusta a posição para R$ 13.000,00. Se uma nova avaliação já informa R$ 13.000,00, ela passa a ser a base do próximo cálculo. A posição é uma estimativa entre avaliações, e a rentabilidade exige dados adicionais.
- Aporte reduz o saldo disponível e resgate aumenta o saldo disponível na data da operação. O histórico recebe uma única transferência por movimento e a tag predefinida **Investimentos** é automática e obrigatória. A transferência deixa intactos os totais de receitas, despesas e o resultado do mês.
- Rendimento recebido gera uma única receita com a tag predefinida **Investimentos** na data do recebimento. Se R$ 100,00 em dividendos caem na conta, as receitas, o resultado do mês e o saldo disponível sobem R$ 100,00. A posição da aplicação segue a última avaliação ajustada pelos aportes e resgates posteriores.
- R$ 0,00 é um valor válido para uma posição. Se os movimentos posteriores produzirem uma estimativa negativa, a aplicação fica “A avaliar” até receber um valor atualizado. Se alguma posição estiver indisponível, a carteira indica o total parcial e quantas aplicações ele cobre.

## Consistência dos dados

- Cada movimento aparece uma única vez no caixa e preserva sua relação com a aplicação. Gravações e correções devem refletir a mesma operação nas duas visões. Repetir uma intenção de escrita devolve o mesmo resultado. Um conflito de versão preserva o rascunho para revisão.
- A tag padrão Investimentos já é cadastrada para novos usuários. Resolva a tag predefinida da própria conta. O tipo do movimento determina se a entrada é transferência ou receita. Um lançamento comum com a tag Investimentos mantém sua classificação. Na #119, confirme a estratégia de identificação da tag em contas existentes e o contrato do vínculo antes de alterar persistência ou API.
- Use dinheiro decimal, datas do calendário do Oriens, validação de posse, consultas em lote e migrações aditivas quando necessário. Cubra 404 de recurso alheio, precisão dos totais, reenvio sem duplicidade, correção consistente e leitura do histórico existente.

## Modelo e contrato da carteira (#119)

Aprovados em 25/11/2026. A migração `V15__investment_portfolio.sql` é aditiva. O número 15 evita colidir com a V14 da `dev`.

- **Tag Investimentos.** A coluna `tags.system_key = 'INVESTMENTS'` identifica a tag em cada conta, e renomear a tag não a desfaz. A migração adota a tag que já se chama "Investimentos", padrão ou personalizada, e cria a tag nas contas sem ela. O cadastro de usuário grava a chave, e o servidor resolve a tag ao gravar cada movimento.
- **Classificação explícita.** `financial_entry.kind` assume `STANDARD`, `INVESTMENT_TRANSFER` ou `INVESTMENT_INCOME`. Lançamentos existentes ficam `STANDARD`. Receitas, despesas, série diária e composição por categoria excluem `INVESTMENT_TRANSFER`. O resumo traz `investmentTransfers` com o líquido das transferências do período para compor o saldo.
- **Tabelas.** `investments` guarda nome e classe (`FIXED_INCOME`, `STOCKS`, `REAL_ESTATE_FUNDS`, `OTHER`). `investment_valuations` guarda data e valor maior ou igual a zero. `investment_movements` guarda tipo (`CONTRIBUTION`, `WITHDRAWAL`, `INCOME`), valor positivo, data, descrição e `entry_id` único. As tabelas têm versão e FKs compostas com `user_id`. Uma sequência comum (`recorded_seq`) ordena avaliações e movimentos do mesmo dia.
- **Lançamento vinculado.** Um aporte gera −valor e um resgate gera +valor, ambos `INVESTMENT_TRANSFER`. O rendimento gera +valor como `INVESTMENT_INCOME`. Movimento e lançamento mudam na mesma transação. A rota de lançamentos recusa editar ou excluir um lançamento vinculado com 422.
- **Posição.** A posição parte da última avaliação e soma aportes e resgates posteriores, incluindo os do mesmo dia gravados depois da avaliação. O status é `VALUED` ou `ESTIMATED`. Com estimativa negativa o status é `NEEDS_VALUATION`, e sem avaliação é `UNAVAILABLE`. Nesses dois casos a posição vem nula e fica fora do total, que informa quantas aplicações cobre.
- **Exclusão.** A aplicação pode ser excluída quando não tem movimentos ou quando a posição está exatamente em zero. Os lançamentos de caixa permanecem com sua classificação e passam a ser editáveis como lançamentos comuns.

As rotas partem de `/financial/user/{userId}/investments`. As escritas exigem `Idempotency-Key`, e edição e exclusão exigem `If-Match`. Recurso de outra conta responde 404. Valores saem como string decimal e entram como número JSON.

| Rota | Uso |
| --- | --- |
| `GET /`, `GET /{id}`, `GET /summary` | Aplicações paginadas com posição e status. Total, cobertura, aportes líquidos, rendimentos e composição por classe |
| `POST /`, `PATCH /{id}`, `DELETE /{id}` | Cadastro com `initialValue` e `valuedOn`, edição de nome e classe, exclusão |
| `GET` e `POST /{id}/valuations`, `PUT` e `DELETE /{id}/valuations/{valuationId}` | Histórico e correção de avaliações |
| `GET /movements?investmentId&type&startDate&endDate` | Movimentos por aplicação, tipo e data |
| `POST /{id}/movements`, `PUT` e `DELETE /{id}/movements/{movementId}` | Movimentos e o lançamento vinculado |

`EntryDTO` ganha `kind` e `investmentId`. As ferramentas MCP de carteira ficam fora da #119.

## Referências públicas

- A B3 apresenta posição, rendimentos e histórico de aplicações, eventos e vencimentos na Área do Investidor. A separação ajuda a escolher os conceitos da carteira. Leitura direta da página oficial, seção “Área do Investidor”. [B3](https://www.b3.com.br/pt_br/produtos-e-servicos/central-depositaria/canal-com-investidores/area-do-investidor/)
- O Portfolio Performance documenta como agrupa depósitos, retiradas e rendimentos e como distingue fluxos externos de retorno. As duas seções ajudam a definir os rótulos e a decidir quais indicadores os dados sustentam. Leitura direta do manual oficial, páginas “Payments” e “Time-Weighted Rate of Return”. [Payments](https://help.portfolio-performance.info/en/reference/view/reports/performance/payments/) · [Time-Weighted Rate of Return](https://help.portfolio-performance.info/en/concepts/performance/time-weighted/)
- O Status Invest mostra a composição da carteira e o peso de cada posição por classe ou ativo. Leitura direta da seção “Mapa de ativos” na página oficial. [Status Invest](https://lp.statusinvest.com.br/ao/planos/)
- O Actual Budget documenta tipos de entrada, saída e resultado, filtros de datas, agrupamento por categorias e gestão de recorrências. Leitura direta das páginas oficiais. [Custom Reports](https://actualbudget.org/docs/reports/custom-reports/) · [Schedules](https://actualbudget.org/docs/schedules/)
- O Mobills distingue despesas pagas, previstas e valor restante no orçamento. Referência exploratória, consultada na central oficial, seção “Entendendo melhor o Planejamento Mensal”. [Mobills](https://ajuda.mobills.com.br/artigo/17042787020443-entendendo-melhor-o-planejamento-mensal.html)
- A abertura direta dos guias de gastos e importação do YNAB retornou sem texto. O Agent Reach foi tentado com as URLs públicas e não recuperou os artigos devido às restrições de rede e de escrita local. [Spending Breakdown](https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0) · [File-Based Import](https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo)

## Entregas no Oriens

| Tarefa | Resultado | Dependências |
| --- | --- | --- |
| #116 | Protótipo e spec aprovados | Etapa inicial |
| #117 | Visão mensal com composição que abre o histórico filtrado | #116 |
| #118 | Histórico, filtros, lançamento manual e recorrências reorganizados | #116 |
| #119 | API e persistência do registro manual da carteira | #116 |
| #120 | Fluxos e indicadores de carteira no Financeiro | #116, #119 |
| #121 | Evidência de regressão e dos fluxos novos | #117, #118, #120 |

## Fluxo de entrega

- A branch de integração do objetivo é `refac/financial-features-2`. Cada tarefa parte dela e abre o PR contra ela, nunca contra `dev`.
- Nomeie a branch da tarefa como `refac/finance-<tarefa>-<resumo>`, por exemplo `refac/finance-117-visao-geral`. Os checks do CI rodam em PRs para `refac/**`.
- Antes de abrir o PR, rode `code-review` e `security-review` sobre o diff contra a branch de integração e registre o resultado na descrição, conforme o [fluxo de revisão](../guides/pull-request-review.md).
- A #119 apresenta o modelo de dados e o contrato da API para aprovação antes de implementar persistência ou API.
- Ao concluir as tarefas, um PR leva `refac/financial-features-2` para `dev`, com revisão de todo o intervalo.

A validação final cobre desktop e celular, temas claro e escuro, navegação por teclado e recuperação de erro. Os critérios observáveis por entrega estão nas descrições das tarefas. A revisão usa as [convenções de frontend](../conventions/frontend/structure.md), o [guia de regressão visual](../guides/visual-regression.md) e o [fluxo de revisão do Oriens](../guides/pull-request-review.md).
