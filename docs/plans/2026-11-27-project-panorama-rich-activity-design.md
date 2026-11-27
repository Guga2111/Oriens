# Descrição rica, capa e atividade no Panorama

Spec aprovada em 27/11/2026 para a tarefa #143 do objetivo #25, Melhorias Tweaks, no projeto Oriens. A aprovação confirma o formato da descrição, a distribuição da capa e o início do histórico.

## O que já funciona

O [Panorama](../../apps/client/src/components/projects/ProjectOverview.tsx) entregue pelo PR #72 lê a descrição como texto e mostra a capa quando recebe `imageUrl`. O [cartão de projetos](../../apps/client/src/components/projects/ProjectCard.tsx) já consome a mesma imagem. Outras apresentações recebem projeções mais compactas do projeto. A tarefa #101 entregou o [editor de blocos das tarefas](2026-11-25-task-description-editor-design.md), com leitura, edição, salvamento e tratamento de conflitos. O Oriens registra auditoria do MCP, com escopo e prazo de retenção próprios.

## Escopo

- Mostrar a descrição rica em largura de leitura no Panorama e editar no próprio conteúdo com o editor de blocos do Oriens. Incluir títulos, formatação, links, listas e tabelas. Preservar descrições de texto já salvas.
- Expor **Adicionar capa** ou **Trocar capa** no Panorama. Usar a mesma capa nos cards e uma miniatura nas representações compactas do projeto, como navegação, recentes, seletores e tarefas vinculadas. Para projetos sem imagem, manter a identificação atual por cor ou ícone.
- Mostrar atividade em ordem cronológica decrescente no Panorama, com autor ou origem, horário, ação e um ícone correspondente. Incluir criação e alteração de projeto, troca de capa, alterações de objetivos e criação, movimentação, conclusão e remoção de tarefas do projeto. Manter resumo e calendário acessíveis.
- Anexos privados na descrição do projeto e publicações manuais de status ficam para entregas próprias. Anexos das tarefas têm posse e ciclo de vida vinculados à tarefa.

## Alternativas e decisão

| Área | Proposta | Alternativa |
| --- | --- | --- |
| Descrição | Compartilhar o núcleo e os controles do editor existente e persistir o documento estruturado com uma projeção de texto para os consumidores atuais. | Armazenar somente Markdown reduz o schema e exige conversão com perdas para atributos ricos. |
| Atividade | Gravar eventos de domínio a partir da implantação, ao confirmar as operações correspondentes. | Derivar uma linha do tempo dos carimbos atuais cobre algumas criações e conclusões, com lacunas em edições, movimentações e ações desfeitas. |

## Regras e exemplos

- Uma descrição existente com três parágrafos abre com os três parágrafos. Ao gravar um título e uma lista, os blocos aparecem na leitura e permanecem após recarregar. Falha ou conflito mantém o rascunho e informa como continuar.
- Ao trocar a capa em um projeto, o cartão e as referências compactas usam a URL confirmada na próxima renderização. Projetos sem capa oferecem um controle de upload direto no Panorama.
- Editar a descrição, alterar o prazo de um objetivo e concluir uma tarefa cria três eventos pertinentes. Colocar a tarefa na coluna de concluídas produz um evento de conclusão. Repetições idempotentes, operações sem efeito e escritas revertidas deixam o total igual. Uma transferência entre projetos é uma saída na origem e uma entrada no destino.
- O estado inicial explica que o histórico começa a partir da implantação. Os eventos são ordenados por horário e ID, com paginação. O fuso exibido segue a configuração do produto.

## Dados, segurança e consistência

Uma migração Flyway aditiva acrescenta um documento opcional ao projeto e uma tabela de eventos por projeto. Registros anteriores mantêm o texto atual legível. O PATCH continua versionado. Clientes existentes leem a projeção de texto e preservam o documento quando editam outros campos. A API valida estrutura, tamanho e URLs no servidor com o núcleo do codec atual.

As leituras e escritas mantêm a resolução de posse pelo `WorkOwner` e a consulta do dono retorna 404 para projeto alheio. Projeções de capa usam os endpoints existentes e carregamento em lote. Eventos são gravados na mesma transação da mutação de domínio, inclusive quando originada pelo MCP. O registro guarda ação, horário e referências mínimas para identificação, sem copiar o conteúdo das descrições. A remoção do projeto aplica sua política de exclusão aos eventos associados.

O rollback da aplicação mantém o schema aditivo e a projeção de texto legível. As versões anteriores da API deixam de gravar eventos durante o rollback e a retomada segue a ordem normal a partir do retorno da versão nova. [Persistência](../conventions/backend/persistence.md) · [Segurança](../conventions/backend/security.md)

## Decisões que exigem aprovação

| Decisão | Proposta | Estado |
| --- | --- | --- |
| Schema e contratos de descrição e capa | Documento rico opcional e projeções compatíveis no detalhe e nas referências de projeto. | Aprovado em 27/11/2026 |
| Histórico de atividade | Eventos começando na implantação, com o conjunto de ações acima e leitura paginada por projeto. | Aprovado em 27/11/2026 |

## Referências

O cabeçalho e a seção de atividade do Plane orientam a composição e o comportamento. O visual e os componentes usam os padrões do Oriens. [Project Overview do Plane](https://docs.plane.so/core-concepts/projects/project-overview) · [Editor atual do Oriens](2026-11-25-task-description-editor-design.md)

## Entregas no Oriens

| Tarefa | Resultado | Dependências |
| --- | --- | --- |
| #143 | Panorama com descrição rica, capa nas referências do projeto e histórico de alterações gravadas pela UI ou pelo MCP. | Base revisada no PR #72 e editor da #101 |

## Fluxo de entrega

As mudanças de código partem de `dev`, que já inclui o PR #72, na branch `Guga2111/task-143-panorama-rich-activity`. O PR tem destino `dev` e passa por `code-review` e `security-review` conforme o [fluxo de PR](../guides/pull-request-review.md).

## Validação e evidência

Executar lint, build, testes do cliente e da API e integração com PostgreSQL. Cobrir duas contas, 404, paginação, ausência de N+1, conflito de versão, rollback de escrita e reenvio. Em Chromium, conferir título, edição e leitura dos blocos, capa nas referências, atividade e calendário em desktop e celular, claro e escuro e navegação por teclado. Registrar as capturas e resultados em `docs/plans/2026-11-27-project-panorama-rich-activity-evidence.md`. [Setup](../guides/setup.md)
