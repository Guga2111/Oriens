# Contratos e segurança do MCP

Complemente com o [guia de operação](../../guides/mcp-operations.md), as
[regras de autorização](security.md) e o [ADR de OAuth delegado](../../decisions/004-mcp-oauth.md).

## Contratos de gestão

`/integrations/mcp/*` exige o JWT normal. Nunca usar access/refresh token MCP no
REST. GET de conexões/detalhes/histórico usa somente o dono autenticado.
A configuração OAuth exige PKCE dos clientes registrados e a configuração de
segurança separa o transporte MCP das rotas de gestão.
[Clientes OAuth](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpConfiguration.java) ·
[Cadeias de segurança](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpSecurity.java)

PATCH aceita `version` obrigatório e campos opcionais `name`, `scopes`,
`allowedProjectIds`, `allowStandaloneTasks`. Ausente preserva; null explícito é
recusado nos campos editáveis. Renomear incrementa a versão de edição; mudança
real de autorização incrementa também `policyRevision`. Redução é imediata;
ampliação devolve `REAUTHORIZATION_REQUIRED` sem alterar a conexão/token antigo.

Revogação exige versão no primeiro encerramento e confirma o estado final nas
repetições, inclusive sem versão. A linha da conexão e o histórico permanecem.
Histórico aceita `page`, `pageSize`, `from`, `to`, `result`, com janela máxima de
90 dias e ordenação fixa horário/ID decrescente. Escopos conhecidos e dependências
são validados no servidor; até 1000 projetos selecionados precisam pertencer ao dono.

A decisão OAuth exige versão do fluxo, `approve`, nome, escopos solicitados,
allowlist e opção de tarefas avulsas. JWT, cookie e Origin conhecido são
necessários; o primeiro acesso válido vincula o fluxo ao usuário. Expira em dez
minutos e não pode ser reutilizado. A resposta entrega o callback validado para a
interface redirecionar o navegador; o framework gera o código de 60 segundos.

## Ferramenta e segurança

A entrega original P0/P1 publicou somente `oriens_get_context`. A P2 acrescenta
o catálogo de projetos/objetivos/tarefas descrito abaixo; a P3 acrescenta finanças protegidas.
Schemas fechados, conteúdo estruturado e texto vêm da mesma projeção. Nenhum
método Spring é exposto automaticamente.

O transporte é Streamable HTTP stateless do SDK, sem sessão como credencial.
O filtro extrai um principal imutável para o contexto explícito do transporte.
`McpStore.withPolicy` é a fronteira transacional para handlers: trava usuário e conexão,
reconsulta escopos/allowlist atuais e intersecta com o token, mantendo o lock até
o fim da operação e da auditoria. Não autorizar numa transação e escrever depois
em outra. O domínio continua responsável por suas próprias regras e versões.
[Política da conexão](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpStore.java) ·
[Catálogo de escopos](../../../apps/api/src/main/java/com/oriens/oriens_api/mcp/McpScopes.java)

Refresh é rotacionado atomicamente pelo framework e limitado à expiração absoluta
de 30 dias. Lookup é SHA-256; valores recuperáveis ficam criptografados por Spring
Security (`Encryptors.delux`, AES-GCM), com chave externa. Tombstones de refresh
consumidos duram toda a família; replay revoga a conexão e invalida inclusive o
novo access token. Revogação/redução são visíveis sem cache entre instâncias.

Os limites por minuto são compartilhados no PostgreSQL. O transporte MCP aplica
600 requisições por conexão e 1000 por conta, incluindo inicialização e descoberta.
As ferramentas de domínio aplicam ainda as cotas de leitura (120 por conexão e
300 por conta) e escrita (30 por conexão e 60 por conta). O início do OAuth tem
cota de 10 por endereço remoto visto pela API e cliente registrado.
Corpos até 256 KiB. Transações até dez segundos, contadores até cinco e timeout
SDK de quinze segundos. Paginação: 20 padrão, máximo 100.
[CORS e limites de taxa](../../guides/security-browser-and-rate-limits.md)

Sucesso e auditoria são atômicos. Negativas/falhas de ferramenta usam transação
independente após rollback. Falha de auditoria impede dados novos. Eventos não
incluem valores de campos, descrições, dinheiro ou tokens. Campos alterados,
correlação, resultado e duração são metadados; histórico não é backup.

Cleanup em lotes limitados, a cada cinco minutos, inclusive com MCP desabilitado:
fluxos expirados, famílias expiradas, contadores antigos e auditoria além de 90
dias. Não limpar lookup de refresh pelo prazo do access token. O job não precisa das chaves MCP e aguarda as tabelas existirem em deployments
que ainda não receberam a migração; os dados não desaparecem por reinício.

## Verificação

`McpPostgresTest` cobre separação entre credenciais REST e MCP, consentimento
com PKCE, escopos, posse, redução de acesso, revogação e rotação de refresh.
`McpDisabledSecurityTest` verifica que as rotas reservadas ficam indisponíveis
com a integração desabilitada, mesmo com JWT válido.
[Teste OAuth e política](../../../apps/api/src/test/java/com/oriens/oriens_api/work/McpPostgresTest.java) ·
[Teste com MCP desabilitado](../../../apps/api/src/test/java/com/oriens/oriens_api/security/McpDisabledSecurityTest.java) ·
[Execução com PostgreSQL descartável](../../guides/setup.md#api)
