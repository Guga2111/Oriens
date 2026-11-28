# Usar clientes de IA com o Oriens

O MCP permite que um cliente compatível consulte ou altere dados que você
autorizar. O Oriens não pede uma chave de provedor nem executa um modelo de IA.
O processamento e o custo do modelo pertencem ao cliente/provedor escolhido.

Para habilitar ou operar o servidor, consulte o [guia de operação](guides/mcp-operations.md).

## Conectar

1. Entre no Oriens e abra **Configurações → Integrações → Conectar via MCP**.
2. Escolha **Codex** ou **Claude Code**. Copie a configuração produzida pelo seu
   ambiente; não substitua o endereço pelo de outro ambiente.
3. No Codex, acrescente o bloco ao `~/.codex/config.toml`. Se já existir uma
   entrada `mcp_servers.oriens`, atualize-a em vez de duplicá-la. Execute
   `codex mcp login oriens`.
4. No Claude Code, incorpore a entrada `mcpServers.oriens` ao `.mcp.json` do
   projeto, preservando os outros servidores. Na mesma pasta, execute
   `claude mcp login oriens` ou abra `/mcp` e autentique o servidor Oriens.
5. No navegador, confira o cliente e a conta. Se a sessão expirou, entre
   normalmente: uma solicitação ainda válida retorna ao consentimento.
6. Escolha as ações e os projetos. Tudo começa negado, exceto o contexto mínimo
   que identifica a própria conexão. Confira o resumo e autorize ou cancele.

Configuração copiada não significa conexão ativa. A conexão só aparece após
consentimento concluído. Clientes verificados: Codex CLI **0.167.1** e Claude
Code **2.1.325**. Versões anteriores não foram certificadas.

**Outro cliente** fornece URL, emissor e requisitos. O operador precisa cadastrar
esse software e seu callback exato. Não há registro automático; não reutilize o
ID de Codex ou Claude Code para outro aplicativo. Transporte: Streamable HTTP;
OAuth público Authorization Code, PKCE S256, recurso explícito e sem client secret.

### Conectar o OpenBot

1. Confirme com o operador que o OpenBot está habilitado no ambiente. No
   aplicativo distribuído pelo openbot.run, adicione e salve um servidor
   MCP **HTTP** chamado **Oriens**. Use `https://oriens.luisgosampaio.com/mcp`
   para o ambiente público ou a URL MCP do ambiente de teste.
2. Na seção **Sign-in app** (App de login), informe `oriens-openbot` como
   **Client ID** e `mcp:context projects:read tasks:read` em **Scopes**.
   Deixe **Client secret** vazio e confirme que a URL de retorno exibida é
   `http://127.0.0.1:28417/mcp-auth`. Salve e escolha **Sign in**.
3. No navegador, confira **OpenBot** e a conta na tela de consentimento. Para
   o primeiro teste, permita a leitura de projetos e tarefas e selecione
   apenas um projeto sintético. Mantenha a opção de tarefas avulsas desmarcada.
4. De volta ao OpenBot, solicite uma listagem de projetos. A listagem mostra
   apenas o projeto selecionado. Use **Configurações → Integrações → Gerenciar**
   no Oriens para revogar a conexão ao concluir o teste.

O teste inicial usa apenas o token de acesso de 15 minutos. O cliente pode
solicitar `offline_access` em outra autorização se precisar de renovação.
[Cadastro manual na documentação do OpenBot](https://github.com/nightly-labs/openbot/blob/main/docs/architecture/integrations.md#add-an-application)

## Escolher acesso

- **Projetos:** selecione nomes existentes, inclusive arquivados. Novos projetos
  não entram automaticamente, mesmo quando criados pela IA. Operações escolhidas
  valem igualmente para todos os projetos selecionados.
- **Tarefas:** leitura inclui descrições e localizações. As tarefas dos projetos
  selecionados e as tarefas avulsas têm recortes distintos. Mover uma tarefa
  exige acesso à origem e ao destino.
- **Finanças:** ações separadas de leitura/criação/edição/exclusão; abrangem
  lançamentos, categorias e totais de toda a conta, sem filtro implícito por projeto.
- **Leitura necessária:** selecionar uma escrita marca sua dependência de leitura
  somente se ela foi solicitada pelo cliente. Retirar a leitura retira as escritas
  dependentes. Ações não solicitadas permanecem indisponíveis.
- **Exclusões:** começam desligadas. Quando concedidas, dispensam confirmação a
  cada chamada no Oriens. O cliente pode aplicar suas próprias confirmações.
  Excluir projeto/objetivo preserva as tarefas, conforme as regras do Oriens.
- **Renovação:** opcional e limitada a 30 dias desde a autorização. Cada access
  token dura 15 minutos. Refresh rotaciona sem ampliar o acesso.

Os dados autorizados são entregues ao cliente e podem ser processados pelo
provedor usado nele. O nome registrado do cliente não atesta a identidade do
software. Revogar não apaga dados já entregues.

## Estados de tarefa e colunas do quadro

Tarefas e colunas usam os estados `BACKLOG`, `PENDING` (To-Do), `ON_DOING` (In Progress), `CONCLUDED` (Done)
e `CANCELLED`. `BACKLOG` é um estado próprio, diferente de `PENDING`, e conta como trabalho aberto (planejamento,
lembretes e prazos). Projeto de desenvolvimento nasce com as colunas Backlog, To-Do, In Progress, Done e Cancelled,
e tarefa nova de projeto entra no Backlog. Pedir só o estado `BACKLOG` ou `PENDING` leva a tarefa à primeira coluna
desse estado; para `ON_DOING` e `CANCELLED`, informe a coluna.

## Descrição de tarefas em Markdown

`oriens_create_task` e `oriens_update_task` recebem Markdown no campo `description`.
`oriens_get_task` e `oriens_list_tasks` devolvem essa descrição como Markdown
legível. O limite é de **10.000 caracteres** com os marcadores. No update,
campo ausente preserva a descrição e `null` limpa.

- Use CommonMark e GFM para títulos de nível 1 a 6, citação, divisor, listas,
  checklist, tabela, links, negrito, itálico, tachado e código inline.
- Para nota em destaque, use `> **Nota:** texto`. Para um bloco recolhível, use
  `> **Recolhível:** título`, uma linha vazia citada (`>`) e o corpo dentro da
  citação. Para uma citação comum que comece com um desses rótulos em negrito,
  inicie com `> <!-- oriens:quote -->` e uma linha vazia citada.
- Use blocos cercados com linguagem para código. A linguagem `mermaid`
  renderiza um diagrama na UI e entrega o código-fonte ao MCP.
- Use `![texto alternativo](url)` para imagem e `[Vídeo — nome](url)` para vídeo.
  A URL externa precisa ser HTTPS. Um anexo privado usa
  `oriens-attachment:<uuid>`. Para acessá-lo, chame
  `oriens_get_task_attachment` com `taskId` e `attachmentId`. A ferramenta
  exige `tasks:read`, acesso à tarefa e vínculo ativo. A URL retornada expira
  em cinco minutos.
- Sublinhado, cor do texto e marca-texto preservam o conteúdo textual na saída.
  O documento da interface guarda esses estilos. Um PATCH de descrição via
  MCP substitui o documento pelos blocos do Markdown enviado.

## Revisar, reduzir ou revogar

Em Integrações, **Gerenciar** mostra permissões, projetos nomeados, estado,
autorização, expiração, último uso real e histórico paginado dos últimos 90 dias.
Use o filtro de resultado para distinguir sucesso, recusa, falha ou repetição.
O histórico contém metadados e identificadores, não o conteúdo dos registros.

Editar nome/reduzir acesso usa **Salvar permissões**. Reduções valem na próxima
chamada. Um conflito mantém o rascunho; use **Descartar rascunho e recarregar**
para revisar a versão atual antes de salvar. Erros transitórios mantêm escolhas;
após perda da resposta, recarregue para conferir se a edição foi concluída.

**Ampliar acesso** orienta outra autorização no cliente. Para ampliar, atualize a
configuração se necessário, encerre a autenticação local (`codex mcp logout oriens`
ou `claude mcp logout oriens`) e inicie login novamente. A autorização cria outra
conexão; a anterior conserva suas permissões até ser explicitamente revogada.

**Revogar acesso** exige uma confirmação que nomeia a conexão. Interrompe
chamadas futuras e renovação; operações concluídas permanecem. Sair do Oriens ou
fechar o cliente não revoga a autorização. Conexões expiradas/revogadas conservam
histórico, mas não podem voltar a operar: uma nova autorização é necessária.

## Resolver problemas

| Situação | Próxima ação |
| --- | --- |
| MCP não habilitado | O operador ainda não liberou o recurso no ambiente; login e demais integrações continuam disponíveis. |
| Solicitação inválida/expirada/indisponível | Inicie uma nova autorização pelo cliente, no mesmo navegador que recebeu a solicitação. O prazo do consentimento é dez minutos. |
| Sessão do Oriens expirada | Entre pelo botão da mensagem; o fluxo válido retoma sem transmitir o JWT em URL. |
| Ação indisponível | Inclua o escopo na configuração do cliente e autorize novamente. |
| Cliente conectado, mas projeto invisível | Autorize esse projeto numa nova conexão; conhecer seu ID não concede acesso. |
| Conflito de registro ou conexão | Releia o estado/versão e revise a intenção. Não sobrescreva automaticamente. |
| Timeout de escrita MCP | Repita a mesma intenção com a mesma chave UUID, payload e versões. Não crie outra chave para o mesmo efeito incerto. |
| Limite de uso | Respeite `retryAfterSeconds`/`Retry-After`, mantendo a chave de uma escrita pendente. |

Referências: [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
e [OAuth no Claude Code](https://code.claude.com/docs/en/mcp), consultadas em
16/11/2026. A configuração da interface e as provas usam os mesmos formatadores.
