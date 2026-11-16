# MCP P3 — inspeção da interface financeira

Escopo aprovado: adaptar componentes existentes, preservando layout, tipografia,
paleta e navegação. Aplicada a exceção de componente/seção de
`design-taste-frontend`: sem sorteio, seed ou redraw; direção Oriens existente.
Pergunta da tela: “Qual é meu saldo e quais lançamentos explicam esse valor?”.
Pergunta do formulário: “Como registrar ou revisar este lançamento com segurança?”.

## Método e dados

Build Vite de produção, Playwright/Chromium e inspector `--app`, 1440/768/390 px.
A referência usa uma cópia temporária do frontend de `8ed77fc`, cujo código de
interface ainda era o original. Nenhum checkout/reset foi feito no workspace.
O resultado usa a API e PostgreSQL descartáveis do runner P3, com JWT e registros
sintéticos. O proxy local apenas serve o build e fornece o perfil sintético;
os endpoints financeiros são encaminhados à API real de teste.

Fixtures: categoria Alimentação; Café sintético −R$ 12,34; receita/recorrência
sintética R$ 2.500,00; Browser idempotente −R$ 5,67. O teste edita e exclui o café;
o saldo final R$ 2.494,33 vem dos registros restantes. Nenhuma dessas amostras foi
incluída no produto. Nenhuma fotografia, ilustração, fonte ou dependência nova.
Não há imagens encontradas que exijam crédito.

Capturas e relatórios locais reproduzíveis:

- `oriens-front/.taste-skill/p3/before/`: tela, criação e edição nos três tamanhos.
- `oriens-front/.taste-skill/p3/after/`: as mesmas vistas, envio incerto e conflito.
- `inspect/`: todas as capturas de fold e folhas de rolagem do inspector.
- `behavior.json`: repetição após commit, conflito, recarga, recorrência e teclado.

Os diálogos são fotografados após estabilizar a animação. Todas as capturas de
cada rodada final foram abertas e avaliadas, incluindo as folhas do inspector.

## Medidas antes/depois

| Verificação | Antes | Depois |
| --- | --- | --- |
| Inspector nos três viewports | 0 FAIL, 2 WARN | 0 FAIL, 2 WARN |
| Overflow horizontal | Ausente | Ausente |
| Tipografia, paleta, frame e conteúdo | Referência Oriens | Preservados |
| Edição no celular | Modal central | Drawer com rodapé acessível |
| Repetição de escrita | Sem precondições | Mesmo payload/chave/versão |
| Conflito | Erro genérico | Rascunho preservado; recarga explícita |
| Encerrar recorrência | Sem campo na edição | Data final na origem |

Allowances explícitas no inspector:

- `palette-cream`: identidade visual existente e preservada pelo escopo aprovado.
- `edge-text`: falso positivo do Recharts, não texto encostado na tela. O elemento
  `#recharts_measurement_span` tem `aria-hidden=true` e está em `top=-20000px`.
  Os JSONs de medição registram isso; a legenda visível está dentro das margens.
  Não foi ocultado ou alterado nenhum elemento para satisfazer o inspector.

WARNs conservados: bordas existentes com contraste 1,45:1 e uma faixa interna
vazia de 43 px no gráfico “Distribuição do mês”. Ambos já estavam na referência;
não impedem leitura ou interação. Mantê-los evita redesenhar gráficos e tokens
fora do escopo de adaptação aprovado. O lint dos quatro componentes alterados
termina em 0 FAIL/0 WARN. O lint de toda a pasta informa três WARNs no seletor de
cor de categorias existente (`TagManagementDialog`, não alterado).

## Crítica

ROUND 1
Seen in one second: saldo mensal legível, ação Nova entrada, categorias e histórico.
Idea (one sentence): o lançamento existente do Oriens continua sendo o objeto de trabalho, agora com confirmação segura da mesma intenção.
Live thing: criar, editar, encerrar uma recorrência e excluir usando a API real isolada.
Layout words by section: saldo=faixa / gráficos=duas colunas / histórico=tabela ou lista / formulário=coluna com ações fixas.
Scores: design 7 · usability 7 · creativity 6 · content 8 → overall 6.9
Caps applied: criatividade limitada ao desenho existente; regras de fotografias/movimento de landing pages não se aplicam a app screens.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `before/390-edit.png`: modal central comprime as ações; usar o drawer responsivo já existente no produto.
2. `after/390-create-uncertain.png` da primeira rodada: dois avisos repetiam informação e empilhavam bordas; consolidar em um aviso inline com ação de repetição clara.
3. `after/390-version-conflict.png`: separar o aviso do campo bloqueado e nomear a recarga que descarta o rascunho; manter o botão de salvar bloqueado até essa decisão.

ROUND 2
Seen in one second: saldo e ação principal iguais à referência; formulários indicam o estado da tentativa sem perder os campos.
Idea (one sentence): o usuário revisa um lançamento sem que rede ou edição concorrente transforme uma intenção em duas escritas.
Live thing: perda de resposta após commit reproduzida para criação/exclusão; conflito real resolvido por recarga explícita.
Layout words by section: saldo=faixa / gráficos=duas colunas / histórico=tabela ou lista / formulário=drawer ou diálogo, aviso único, campos e rodapé.
Scores: design 7 · usability 8 · creativity 6 · content 8 → overall 7.2
Caps applied: criatividade limitada ao desenho existente; sem teto por FAIL (zero).
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `after/768-page.png`: gráfico com uma única categoria ocupa bastante altura; herdado, mantido para preservar a composição aprovada.
2. `after/inspect/desktop-fold.jpg`: bordas dos painéis acima do contraste recomendado; herdadas dos tokens atuais, sem alteração global de paleta.
3. `after/inspect/desktop-fold.jpg`: 43 px de espaço interno no gráfico de distribuição; sem perda de conteúdo, mantido fora da adaptação de formulários.

A nota 7,2 é deliberadamente inferior a 7,5: trata-se da evolução funcional da
interface existente, com as limitações de densidade e borda registradas acima,
sem alegação de redesenho visual completo.
