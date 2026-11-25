# Editor de blocos da descrição de tarefas

Tarefa #101, no objetivo Melhorias Tweaks do projeto Oriens. O usuário escolheu a VPS para os anexos.

## Comportamento atual

O `TaskPeek` usa `InlineText` para título e descrição nas três visualizações. O formulário `TaskEditor` envia a descrição de texto mesmo quando o usuário alterou outro campo. `ProjectWorkService` concentra a escrita do domínio e já valida a versão da tarefa e do projeto. O MCP usa esse serviço para escrever. `ScopedWorkReadService` inclui a descrição no detalhe, mas a projeção paginada da listagem entrega apenas metadados.

O [editor de texto rico do Plane](https://github.com/makeplane/plane/blob/723bb178f97b87e80a23df9eed134eb1388d7465/packages/editor/src/components/editors/rich-text/editor.tsx) combina extensões Tiptap, menu de bloco e menu de seleção. O [menu de comandos](https://github.com/makeplane/plane/blob/723bb178f97b87e80a23df9eed134eb1388d7465/packages/editor/src/extensions/slash-commands/root.tsx) ancora a sugestão no cursor, trata o teclado e desativa o gatilho em bloco de código. A [lista de comandos](https://github.com/makeplane/plane/blob/723bb178f97b87e80a23df9eed134eb1388d7465/packages/editor/src/extensions/slash-commands/command-items-list.tsx) agrupa operações e usa termos de busca. Essa implementação orienta o comportamento. Os controles, ícones, espaçamento e temas seguem o Oriens.

## Decisões de projeto

| Área | Proposta | Outra opção |
|---|---|---|
| Persistência | Documento estruturado em coluna `description_doc jsonb` anulável. `description` continua como a string pública e recebe o Markdown derivado. O JSON tem versão de schema no próprio envelope. | Markdown como único formato reduz a persistência, mas exige extensões no texto público para preservar atributos ricos ou perde cor, marca-texto e sublinhado no editor. |
| Conversão e editor | CommonMark Java com extensões GFM para tabela, checklist e tachado. No cliente, Tiptap para transações e blocos, Lowlight para código e Mermaid carregado sob demanda. | Um serviço Node compartilhado poderia reutilizar o schema Tiptap na conversão, com custo de manter e operar outro runtime no backend. |
| Mídia | Diretório privado no volume persistente existente da VPS. O conteúdo guarda a referência do anexo. O Oriens emite uma URL GET assinada após autorizar a leitura. | Um bucket privado acrescentaria armazenamento gerenciado e uma integração com outro serviço. |

As dependências Tiptap ficam limitadas ao núcleo React/ProseMirror e às extensões de listas, tabelas, placeholder, sugestões e alça. Os blocos e as marcas de cor do Oriens usam o schema do editor. As versões compatíveis com React 18 e Java 25 são fixadas nos manifests e lockfiles aplicáveis. [Menus e alças do Tiptap](https://tiptap.dev/docs/editor/extensions/menus) · [CommonMark Java](https://github.com/commonmark/commonmark-java)

## Editor e visualização

- A descrição abre em leitura no painel lateral, no modal ou em tela cheia. Uma ação contextual abre a edição no local e move o foco para o conteúdo. O título continua com `InlineText`. A descrição vazia oferece “Adicionar descrição…”.
- O menu `/` filtra pelo nome e por sinônimos em pt-BR, sem distinção de caixa ou acento. **Básicos** tem texto, títulos 1 a 6, citação, nota em destaque, recolhível e divisor. **Listas** tem marcadores, numerada e tarefas. **Layout e mídia** tem tabela, imagem, vídeo, código com linguagem e Mermaid. Setas e Enter operam a seleção. Esc fecha o menu e preserva o editor. Um controle “Inserir bloco” dá acesso às mesmas opções por toque e teclado.
- A alça aparece à esquerda do bloco sob ponteiro ou foco. Ao arrastar, a seleção e a posição de destino ficam visíveis. O menu da alça oferece “Mover para cima” e “Mover para baixo” para teclado e toque. A transação conserva o conteúdo, atributos e histórico de desfazer.
- A seleção de texto abre a barra com negrito, itálico, sublinhado, tachado, código, link, cor do texto e marca-texto. As cores pertencem a uma paleta de tokens semânticos em ambos os temas. Os atalhos de entrada para títulos, listas, checklist, citação e código funcionam no início do bloco. A barra e os popovers preservam a seleção ao receber foco.
- Em leitura, documentos altos têm prévia com esmaecimento no final e “Mostrar tudo” / “Mostrar menos”. Controles fora da área visível ficam fora da navegação por Tab enquanto a prévia está recolhida. Tabelas e código rolam dentro do painel estreito; imagem e vídeo respeitam a largura do conteúdo.
- `TaskEditor` só envia mudanças de descrição quando o usuário edita esse campo. No formulário de edição, reutiliza o campo rico com o envio do formulário. A criação continua aceitando texto no campo atual. Arquivos são anexados a uma tarefa existente.
- Linhas, cartões e Todos os dados mostram texto puro, com alternativa textual de mídia. A projeção da API fornece esse texto a partir do documento; o cliente usa o texto legado como fallback durante a atualização.

## Persistência, REST e MCP

- A migração Flyway é aditiva. Linhas existentes mantêm `description` intacta e `description_doc` nulo. O detalhe abre o legado como texto literal, preservando quebras e caracteres. A primeira edição rica escreve o documento validado e as projeções na mesma transação. `ddl-auto=validate` permanece na configuração de produção.
- POST e PATCH REST mantêm o campo `description` para clientes de texto. O campo opcional `descriptionDoc` aceita o documento de blocos. A combinação dos dois campos é erro de validação. No PATCH, ausência preserva e `null` limpa. Uma escrita explícita pelo campo legado aplica texto simples. A leitura de detalhe inclui o documento quando presente; listas e quadros usam o texto breve e preservam o campo existente.
- O codec no domínio converte Markdown em nós permitidos e nós em Markdown e texto puro. REST e MCP usam a mesma validação de estrutura, atributos, links e tamanho em `ProjectWorkService`. A API deriva as projeções do conteúdo validado. A versão e a associação da tarefa continuam validadas no serviço existente.
- `oriens_create_task` e `oriens_update_task` tratam `description` como Markdown. `oriens_get_task` e `oriens_list_tasks` retornam `description` como Markdown ou `null`. Descrições legadas continuam legíveis no MCP. A listagem acrescenta a string no mapper paginado, sem trazer detalhes de vínculos nem consultar anexos por tarefa. O catálogo e o [guia do MCP](../mcp.md) descrevem formato, anexos e limite.
- Preservar o teto atual de **10.000 caracteres** para o Markdown armazenado e entregue pelo MCP. Validar também a entrada e os limites de bytes, profundidade e número de nós do documento antes de converter. Contar os marcadores Markdown no teto e cobrir Unicode e limites de fronteira nos testes.

| Conteúdo | Markdown do MCP |
|---|---|
| Texto, títulos, listas, citação, divisor | CommonMark, com títulos ATX de `#` a `######`. |
| Checklist, tabela, tachado | GFM, com estados `- [ ]` e `- [x]`. |
| Nota em destaque | Citação cujo primeiro parágrafo começa com `**Nota:**`, com o corpo dentro da citação. A sequência reservada tem escape documentado para citações comuns. |
| Recolhível | Citação com `> **Recolhível:** título`, linha vazia citada e corpo dentro da citação. Citações aninhadas permitem recolhíveis internos. |
| Código e Mermaid | Cerca de código com a linguagem. `mermaid` identifica um diagrama e preserva o código-fonte. |
| Link e mídia remota | Links e imagens em sintaxe padrão com URL HTTPS. Vídeo como link rotulado “Vídeo — nome”, com prévia para arquivo compatível. |
| Mídia enviada | Imagem com alt ou vídeo com rótulo, usando referência `oriens-attachment:<uuid>`. O catálogo explica como abrir o anexo pelo MCP. |
| Estilos inline | Negrito, itálico, tachado, código e links usam Markdown. O texto de trechos sublinhados, coloridos ou marcados sai integralmente. Esses estilos ficam no documento rico e são omitidos na saída Markdown. |

A ida e volta preserva significado e estrutura dos blocos suportados. A representação pode normalizar espaçamento ou delimitadores equivalentes, preservando texto, estados, títulos e linguagens. Conteúdo Markdown sem representação segura no schema é tratado explicitamente, preservando o texto ou retornando erro de validação que identifica o campo. HTML recebido é tratado como texto literal. O preview Mermaid usa renderização isolada, saída SVG sanitizada, limite de entrada e recursos, sem callbacks, links ativos ou configuração do diagrama capaz de sobrepor as restrições. Um diagrama inválido exibe mensagem e mantém o código disponível para edição. [Configuração de segurança do Mermaid](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html)

## Salvamento automático e conflito

O editor do painel salva após uma pausa curta e tenta enviar a última revisão ao sair com Esc. Fila de uma requisição por tarefa, com coalescência do rascunho mais recente e atualização da versão após sucesso. O cache recebe a resposta validada. Refetch e mudança de apresentação do painel preservam edições locais; uma resposta atrasada só confirma o snapshot enviado. “Salvando…” e falhas são anunciados sem interromper a digitação.

No 409, buscar a versão atual e preservar o rascunho. Se o conteúdo remoto da descrição for igual à base da edição, reaplicar sobre a nova versão. Se a descrição mudou, mostrar a opção explícita de manter a versão local ou carregar a remota, com acesso ao texto de ambas. Falhas de transporte ou validação mantêm o rascunho e apresentam “Tentar novamente” ou a instrução para corrigir a entrada. Preservar a edição local ao reabrir a tarefa na mesma sessão, com escopo por conta e tarefa. Evitar gravação silenciosa sobre conteúdo concorrente e limpar rascunhos ao confirmar o salvamento ou sair da conta.

## Anexos privados

- O upload autenticado usa corpo binário por tarefa, com dono conferido na consulta e vínculos validados em lote ao salvar o documento. Imagens JPEG, PNG, GIF e WebP têm limite de 2 MiB e vídeos MP4 e WebM têm limite de 20 MiB. Há até 32 arquivos por tarefa e 256 MiB por conta, incluindo pendências. O servidor valida o tipo pelos bytes, dá um UUID ao arquivo e mantém os limites multipart dos outros uploads. A descrição alternativa da imagem e o nome do vídeo são obrigatórios.
- O MCP acrescenta `oriens_get_task_attachment(taskId, attachmentId)` com `tasks:read` e a mesma política de acesso à tarefa do detalhe. Em ambos os canais, recurso fora do escopo ou vínculo inválido responde como recurso não encontrado. A URL é assinada para leitura por cinco minutos. Ela fica fora do Markdown persistido e da auditoria.
- O backend registra a reserva antes de gravar no volume e publica o arquivo por rename atômico. O vínculo ativo é confirmado junto com a gravação do documento. A limpeza revalida pendências e tarefas excluídas antes de apagar arquivos. O endpoint de conteúdo oferece leitura parcial para vídeo. O servidor valida URLs externas sem buscá-las.
- Em produção, o diretório privado fica em `/opt/oriens-uploads/task-attachments`. A operação inclui os arquivos no backup e na restauração do PostgreSQL. A API local e os testes usam um diretório descartável. Consulte os [requisitos do proxy e do volume](../guides/deploy.md#anexos-privados-de-tarefas).

## Sequência e evidência

1. **Contrato e persistência.** Codec, migração, DTO e schemas MCP. Testes Markdown ↔ documento para cada tipo e casos mistos, texto legado, `null` e ausência em PATCH, Unicode, limite do Markdown gerado, links, HTML e tamanho do documento. Cobrir escrita concorrente e consulta paginada sem N+1 em PostgreSQL.
2. **Interação.** Integrar `TaskPeek` e formulário. Testar menu, atalhos, seleção, tabela, código e Mermaid, arrastar e reordenar com teclado, prévia, Esc, falhas, 409, troca de painel e atualizações rápidas. Usar shadcn e tokens do Oriens. Registrar antes/depois em desktop e telefone, temas claro e escuro, com as verificações de design-taste-frontend em modo app, Impeccable e Playwright.
3. **Mídia e travessia entre superfícies.** Testar upload, tipo, tamanho, propriedade e vínculo com duas contas, inclusive URL expirada e escopos MCP. Gravar pelo editor e ler em `get_task` e `list_tasks`. Gravar via `create_task`/`update_task` no MCP e abrir no editor. Verificar superfícies de texto puro e a permanência de blocos ao editar outros campos.
4. **Entrega.** Atualizar o contrato REST e o guia de operação afetado. Rodar as suítes focadas, lint, build e regressão visual. Registrar resultados e lacunas nas revisões de segurança e de código.
