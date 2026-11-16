# Usar clientes de IA com o Oriens

O MCP permite que um cliente compatível consulte ou altere dados que você
autorizar. O Oriens não pede uma chave de provedor nem executa um modelo de IA.
O processamento e o custo do modelo pertencem ao cliente/provedor escolhido.

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

## Operação e publicação

O procedimento de schema, segredos, limites, retenção, rotação e recuperação está
em [ops/mcp-account](../oriens-api/ops/mcp-account/README.md). MCP permanece
**desabilitado por padrão**. P4 não acrescenta migração nem habilita ambientes.

Antes de habilitar um ambiente público:

1. Identifique host/banco/operador, backup e restore isolado; confirme as revisões
   aditivas P0/P1 → P2 → P3, checksums e `ddl-auto=validate`.
2. Publique API e frontend compatíveis com versões/idempotência financeira antes
   de reabrir escritores. Não mantenha instâncias financeiras antigas em paralelo.
3. Configure issuer/recurso HTTPS, origem confiável de frontend e callbacks exatos.
   A ponte atual usa cookie HttpOnly Secure/SameSite Lax: frontend e API devem ser
   do **mesmo site**, com HTTPS em ambos (subdomínios distintos são permitidos).
   Origens completamente distintas não são cobertas por essa topologia. Não
   enfraqueça CSRF/CORS/cookie para contornar uma publicação incorreta.
4. Desabilite registro de query strings de OAuth/callback, cookies, Authorization
   e corpos com credenciais no proxy/APM. Sirva a SPA com fallback para `/config`
   e `/auth`. O frontend não deve ter analytics capturando esses fluxos.
5. Confira os metadados públicos pelo endereço HTTPS publicado. Execute os dois
   clientes, autorize uma leitura sintética, recuse acesso fora do recorte, reduza
   acesso e revogue. Confirme login normal, WhatsApp e estados nos três tamanhos.
6. Habilite o flag em todas as instâncias somente após o smoke. Observe erros,
   limites e correlação sem conteúdo de domínio. A evidência loopback não prova
   certificados, proxy ou DNS públicos.

Rollback: desabilite MCP/novas autorizações em todas as instâncias e preserve
schema aditivo, versões, recibos, tombstones e histórico. O login normal continua
disponível. Volte apenas para uma API/frontend compatível com as escritas
financeiras protegidas; um escritor que ignora versões não é um rollback seguro.
Restaurar banco exige alvo novo/isolado e troca coordenada conforme o runbook.
O teste P4 verifica desligar/religar em instâncias independentes com o mesmo
PostgreSQL descartável e sem perda da autorização persistida.

Referências: [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
e [OAuth no Claude Code](https://code.claude.com/docs/en/mcp), consultadas em
16/11/2026. A configuração da interface e as provas usam os mesmos formatadores.
