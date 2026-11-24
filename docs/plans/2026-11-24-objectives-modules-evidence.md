# Objetivos — evidências da entrega

Data: 24/11/2026. Design e nome aprovados em [objetivos](2026-11-24-objectives-modules-design.md).

## Entrega

- Lista compacta, sem formulário permanente ou abas binárias; filtro de status e Novo objetivo no cabeçalho.
- Progresso calculado sobre tarefas não canceladas, independente do status manual do objetivo.
- Seis estados: Backlog, Planejado, Em andamento, Pausado, Concluído e Cancelado.
- Descrição simples, início e término opcionais; edição do período/status na linha e formulário completo no painel.
- Painel lateral no desktop e tela inteira no celular; tarefas vinculadas, criação/abertura de tarefas, tentativa após falha e confirmação de descarte/exclusão.
- Contratos REST e MCP aditivos; campos ausentes preservados em PATCH, null limpa opcionais. Migração V10 preserva PENDING, CONCLUDED e due_date existentes.
- Sem dependências novas ou alteração global no design system. Reutiliza tokens, controles shadcn e ícones de status existentes.

## Validação executada

| Prova | Resultado |
|---|---|
| `npm run lint` | 0 erros; 14 avisos em arquivos fora dos componentes novos |
| `npm test` | 46 arquivos, 331 testes passando |
| Testes focados após ajuste de foco ao abrir o painel | 13 testes passando |
| `npm run build` | Passou; avisos existentes de tamanho do bundle e classe de duração |
| `ops/postgres-tests.sh ProjectWorkPostgresTest WorkApiPostgresTest McpP2PostgresTest` | Passou; PostgreSQL 15 descartável, migrações V1–V10 e Hibernate validate |
| `ops/postgres-tests.sh ObjectiveDetailsPostgresTest` | 6 testes passando: dados, seis estados, período, PATCH parcial, posse, versão, idempotência e indicadores |
| `ops/postgres-tests.sh McpP2PostgresTest` após novo teste MCP | 30 executados passando; 2 verificações opcionais desativadas |
| `./mvnw -q test -Dtest=WorkCreationCompatibilityTest` | 2 testes passando, incluindo replay de recibo anterior aos novos campos |
| Total das suítes selecionadas de backend/MCP | 71 executados passando; 4 verificações opcionais desativadas |
| Detector Impeccable nos três componentes de objetivos | Nenhum achado (`[]`) |
| `git diff --check` | Sem erros |

Java 25 via instalação local Homebrew. Docker e Mockito executados com acesso fora do sandbox; sem instalação de dependências. A tentativa inicial de Mockito dentro do sandbox falhou ao anexar o agente Java; a mesma prova passou fora dele.

A checagem adicional `tsc --noEmit -p tsconfig.app.json` ainda aponta 15 erros de inferência (`params` como `unknown`) em testes fora desta entrega: dashboard-contract, project-detail-timeline e today-integration. Nenhum erro foi apontado nos arquivos de implementação novos. Não foi feita refatoração desses testes.

## Inspeção visual

Navegador Orca, prévia isolada com componentes reais e dados sintéticos, sem chamadas ao banco/aplicação do usuário. Lista, calendário de intervalo e painel inspecionados; temas claro/escuro. Celulares de 360 e 390 px sem overflow horizontal. Painel medido em 390×844 px, ocupando toda a tela. Datas compactas mantêm período e status na segunda linha. Foco automático de texto reservado à criação para não abrir o teclado ao consultar o detalhe.

Capturas da lista:

- [Desktop claro](../screenshots/objectives-modules/list-desktop-light.png)
- [Desktop escuro](../screenshots/objectives-modules/list-desktop-dark.png)
- [Celular claro](../screenshots/objectives-modules/list-mobile-light.png)
- [Celular escuro](../screenshots/objectives-modules/list-mobile-dark.png)

Prévia, arquivos auxiliares e abas removidos; servidor temporário encerrado. Não foi executado Playwright com a API real nem alterado banco compartilhado.

## Aplicação no ambiente

A API do ambiente precisa ser atualizada/reiniciada para aplicar V10 via Flyway antes de usar os campos novos no frontend. Observar o procedimento de backup/restore do repositório antes de aplicar em banco compartilhado. Publicar frontend/API compatíveis juntos: uma API antiga não reconhece os novos valores de status depois que forem gravados. A migração não reclassifica nem remove os objetivos existentes.

## Ajuste — sheet de informações

O clique no objetivo agora abre um sheet de consulta de 448 px no desktop e tela inteira no celular. Mostra título, descrição, propriedades editáveis de status/período, percentual e contagens de progresso, distribuição por estado e tarefas vinculadas. Não há campos de formulário ou botão Salvar nessa consulta. A edição completa abre pelo menu “…” da lista ou do sheet; o sheet é preservado na seleção e reaparece ao fechar a edição. Não são sobrepostos dois modais ativos.

Testes focados: 15 passando, incluindo consulta sem campos, edição explícita pelo menu, retorno à consulta ao cancelar, alteração direta de status e preservação de rascunho. Build e lint passaram (14 avisos existentes). Prévia com dados sintéticos no Orca, desktop e celular 390 px sem overflow. Sem alterações de API ou schema neste ajuste.

- [Sheet desktop](../screenshots/objectives-modules/details-desktop-light.png)
- [Sheet celular](../screenshots/objectives-modules/details-mobile-light.png)

Validação final deste ajuste: suíte completa do frontend com 46 arquivos e 333 testes passando; lint sem erros (14 avisos existentes); build de produção aprovado; detector Impeccable sem achados no novo sheet e `git diff --check` sem erros.

## Distribuição e sheet não modal

Adicionada a seção Distribuição com Tabs/TabsList/TabsTrigger/TabsContent existentes do shadcn: Estado, Etiquetas e Prioridades. Contagens e percentuais calculados somente das tarefas vinculadas; grupos de etiquetas incluem Sem etiquetas e explicam sobreposição quando aplicável. Barras proporcionais em SVG geométrico decorativo, usando tokens existentes. Carregamento, erro, lista vazia e dados indisponíveis diferenciados.

Corrigida a configuração do Sheet para `modal={false}`, idêntica ao TaskPeek; sem overlay escuro, sem bloquear a lista. O componente base shadcn não foi alterado.

18 testes focados passaram: agrupamentos, denominadores com canceladas, múltiplas etiquetas, prioridades, navegação de abas por teclado, zero tarefas, retry e interação da lista com o sheet aberto. Lint sem erros (14 avisos existentes) e build de produção aprovados. Prévia sintética conferida em desktop e celular 390 px sem overflow, com fundo claro preservado. Servidor/aba/arquivos temporários removidos.
