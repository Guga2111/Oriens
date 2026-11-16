# MCP da conta — P0/P1

Revisão `oriens-mcp-account-v1`, aditiva sobre `oriens-statistics-v1`.
Contrato: [SPEC](../../../docs/plans/2026-11-16-mcp-account-spec.md).
[Evidência P0/P1](../../../docs/plans/2026-11-16-mcp-p0-p1-evidence.md).

## Instalação e rollback

Não executar DDL no startup. Não reinstalar a baseline nem alterar seus hashes.
O preflight exige a revisão anterior, checksum e catálogo selados. As constraints
anteriores de dono financeiro permanecem obrigatórias. Não há versão financeira
nesta revisão: ela pertence à P3. Nenhum registro de domínio é reprocessado.

Antes de publicação real, identificar literalmente ambiente, host, porta, banco e
operador; parar escritores/schedulers, conferir backup e restore isolado conforme
[STATISTICS.md](../projects-refactor/STATISTICS.md). Este trabalho não aplicou
migração a banco compartilhado.

```sh
python3 oriens-api/ops/mcp-account/migrate.py \
  --host HOST_EXPLICITO --port PORTA --database BANCO_EXATO --user OPERADOR
```

Usar `.pgpass`/`PGPASSFILE` protegido, nunca senha nos argumentos. Repetir o mesmo
comando verifica o selo sem reaplicar DDL. Drift, revisão desconhecida ou erro
revertem a transação inteira. Banco vazio recebe baseline, etiquetas e estatísticas
antes desta evolução, pelos runners existentes.

Rollback de aplicação preserva o schema aditivo. Desabilitar MCP e autorizações
antes de publicar código anterior. Não apagar conexões/histórico para reverter
código. Recuperação de banco ocorre em alvo novo/isolado, com troca coordenada;
nunca sobrescrever automaticamente o banco atual.

## Configuração

`ORIENS_MCP_ENABLED` é falso na ausência de configuração. Quando falso, as rotas
reservadas MCP/OAuth não caem na autenticação JWT genérica. API normal e login
continuam funcionando. Quando verdadeiro, issuer, frontend, chave/salt externos
e callbacks dos dois clientes são obrigatórios. Consulte `.env.example`.

- `ORIENS_MCP_ISSUER`: origem HTTPS pública da API, sem caminho/query/fragmento.
- `ORIENS_MCP_FRONTEND`: origem HTTPS confiável da interface. Os testes permitem
  explicitamente HTTP em `127.0.0.1`, com origens/portas distintas.
- `ORIENS_MCP_ENCRYPTION_PASSWORD`: segredo gerido externamente, mínimo 32 caracteres.
- `ORIENS_MCP_ENCRYPTION_SALT`: salt hexadecimal externo, mínimo 16 bytes.
- `ORIENS_MCP_CODEX_REDIRECTS`: callbacks exatos do registro `oriens-codex`.
- `ORIENS_MCP_CLAUDE_REDIRECTS`: callbacks exatos do registro `oriens-claude-code`.

Os registros públicos são configuração determinística, com IDs estáveis entre
instâncias, sem DCR, secrets ou autoaprovação. Novos clientes exigem registro e
callbacks próprios; setup desta fase aceita somente `codex` e `claude-code`.
Somente a porta de um callback IP loopback pode variar, pela validação nativa do
Spring. Host e caminho precisam corresponder ao registro; `localhost` usa URL exata.

O issuer/recurso não dependem de `Host` ou forwarded headers. No proxy real,
conferir os metadados por HTTPS e não registrar Authorization, corpos OAuth,
códigos, cookies ou query strings de callbacks. Diagnósticos do SDK que podem
incluir dados de entrada estão desligados; auditoria explícita registra metadados.

A ponte redireciona para `/config?mcpFlow=<id opaco>`. Ela não inclui o JWT e não
aprova nada automaticamente. P4 implementará a tela que consulta/decide o fluxo
usando JWT no header e cookie de correlação. O teste de navegador usa uma página
sintética descartável; não é uma tela de consentimento pronta para publicação.
Não habilitar a experiência de produção antes da P4 e dos seus gates de liberação.

## Contratos de gestão

`/integrations/mcp/*` exige o JWT normal. Nunca usar access/refresh token MCP no
REST. GET de conexões/detalhes/histórico usa somente o dono autenticado.

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

Somente `oriens_get_context` está publicada nesta fase. Schema fechado, sem
argumentos de domínio, conteúdo estruturado e texto gerados da mesma projeção.
Não existem ferramentas de domínio ou escrita habilitadas. P2/P3 acrescentarão
catálogos explícitos, sem autoexposição de métodos Spring.

O transporte é Streamable HTTP stateless do SDK, sem sessão como credencial.
O filtro extrai um principal imutável para o contexto explícito do transporte.
`McpStore.withPolicy` é a fronteira transacional para handlers: trava a conexão,
reconsulta escopos/allowlist atuais e intersecta com o token, mantendo o lock até
o fim da operação e da auditoria. Não autorizar numa transação e escrever depois
em outra. O domínio continua responsável por suas próprias regras e versões.

Refresh é rotacionado atomicamente pelo framework e limitado à expiração absoluta
de 30 dias. Lookup é SHA-256; valores recuperáveis ficam criptografados por Spring
Security (`Encryptors.delux`, AES-GCM), com chave externa. Tombstones de refresh
consumidos duram toda a família; replay revoga a conexão e invalida inclusive o
novo access token. Revogação/redução são visíveis sem cache entre instâncias.

Limites compartilhados no PostgreSQL: 120 leituras/minuto/conexão e 300/conta;
30 escritas/conexão e 60/conta estão reservados na SPEC para P2/P3, pois não há
ferramentas de escrita nesta fase. Inicialização/descoberta tem orçamento próprio
600/conexão e 1000/conta. Início OAuth: 10/minuto por origem e cliente registrado.
Corpos até 256 KiB. Transações até dez segundos, contadores até cinco e timeout
SDK de quinze segundos. Paginação: 20 padrão, máximo 100.

Sucesso e auditoria são atômicos. Negativas/falhas de ferramenta usam transação
independente após rollback. Falha de auditoria impede dados novos. Eventos não
incluem valores de campos, descrições, dinheiro ou tokens. Campos alterados,
correlação, resultado e duração são metadados; histórico não é backup.

Cleanup em lotes limitados, a cada cinco minutos, inclusive com MCP desabilitado:
fluxos expirados, famílias expiradas, contadores antigos e auditoria além de 90
dias. Não limpar lookup de refresh pelo prazo do access token. O job não precisa das chaves MCP e aguarda as tabelas existirem em deployments
que ainda não receberam a migração; os dados não desaparecem por reinício.

## Rotação da chave de proteção

A rotação inicial invalida conexões existentes e exige nova autorização, em vez
de prometer recriptografia online não implementada. Procedimento do operador,
com alvo literal, manutenção, escritores parados e backup/restore conferido:

1. Desabilitar MCP/novas autorizações em todas as instâncias.
2. Em transação, travar conexões em ordem de ID; registrar um evento `key_rotation`
   por conexão ainda não revogada; marcar revogação, incrementar `version` e
   `policy_revision`; encerrar os fluxos temporários. Não apagar histórico.
3. Provisionar nova chave/salt no secret manager em todas as instâncias. Preservar
   a chave antiga somente sob a política de recuperação dos backups.
4. Subir o mesmo código, verificar que tokens anteriores falham e novos fluxos
   funcionam, e só então retomar conforme os gates de liberação. Autorizações
   antigas permanecem revogadas e expiram pela limpeza normal.

Não trocar a chave de somente uma instância. Não habilitar novamente grants
revogados. A execução desse procedimento em ambiente compartilhado precisa de
aprovação operacional explícita; nenhum desses passos foi executado aqui.

## Provas reproduzíveis

```sh
# PostgreSQL próprio + runtime Java 17 real, sem atingir bancos existentes:
python3 oriens-api/ops/mcp-account/test_mcp.py --java17

# CLIs instaladas e Brave/Playwright do projeto; nenhuma inferência externa:
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --clients --browser
```

O runner cria e remove seu container por nome/ID próprio. Fixtures são sintéticos.
A prova Java 17 usa `maven:3.9.9-eclipse-temurin-17`. As provas de clientes usam
Codex app-server e Claude Code real, com credenciais temporárias limpas ao fim;
configuração persistente do usuário não é editada. Claude usa um fixture Messages
local determinístico somente para provocar a chamada; não há modelo externo.
A prova de navegador usa duas origens loopback, cookie HttpOnly, CORS real, JWT no
header e PKCE. Arquivos de evidência em `oriens-api/target/mcp-*-proof.json` não
contêm tokens, códigos, cookies ou conteúdo de domínio.
