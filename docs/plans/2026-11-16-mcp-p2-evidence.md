# MCP — evidência de implementação P2

Data: 2026-11-16. Base: `30b4c85`; desenho aprovado registrado em `3bcfb12`.
Contrato: [SPEC](2026-11-16-mcp-account-spec.md).
Operação: [README](../../ops/mcp-account/README.md).
Resultados sem credenciais: [JSON](2026-11-16-mcp-p2-evidence.json).

## Entrega

Catálogo explícito com 17 ferramentas: contexto existente e 16 de domínio,
cobrindo todos os nomes das seções 10.1–10.3 da SPEC. Não há ferramenta financeira.
Descoberta filtra escopos vigentes por requisição, usando a SPI de transporte do
SDK 0.18.3; o registro global nunca é modificado para atender uma conexão. Cada
chamada relê a interseção de token/conexão e valida novamente os recursos.

`ScopedWorkReadService` é a camada de consulta paginada com predicados de dono,
allowlist e avulsas no banco. Objetivos, colunas e tarefas têm paginação própria;
agregados usam o mesmo predicado, sem carregar uma coleção inteira para cortá-la
no handler. Sem `tasks:read`, não há consulta nem projeção de conteúdo/contagem
de tarefas em projeto, objetivo ou quadro. IDs saem como strings e não há `userId`
nas projeções MCP. Referências de tarefas incluem as versões necessárias.

`ProjectWorkService` continua dono das escritas, transições e locks de domínio.
O patch de projeto agora aceita favorito na mesma operação e precondição dos
demais metadados. Tarefas preservam etiquetas, planejamento e prazo separados.
Movimento valida origem/destino/objetivo/coluna/âncora e usa uma única mutação.
Projeto SIMPLE não é convertido implicitamente. Exclusão preserva tarefas.

`WorkCreationService.execute` generaliza o mesmo ledger existente. Os contratos,
namespaces e hashes de criação REST foram preservados. Namespace MCP inclui
conexão e ferramenta; o hash canônico conserva diferença entre ausência e null.
Confirmação e prova de autorização ficam no corpo protegido como dado de domínio.
Replay exige autorização atual, existência e recorte atuais; exclusões têm
confirmação própria, sem exigir que o alvo ainda exista. As exceções de criação
e exclusão de projeto exigem a mesma revisão de política. Renomear não muda essa
revisão. Corpo expira em 24 horas e a limpeza conserva tombstones.

Locks de usuário precedem locks de conexão em todos os caminhos compartilhados,
inclusive gestão/OAuth, antes dos locks de projeto/tarefa existentes. Mutação,
recibo e auditoria confirmam juntos; falhas são auditadas após rollback. Eventos
registram IDs/nomes de campos/quantidades, sem descrições, localização ou tokens.
Schemas fechados, validação de faixa/tipo/datas, erros sanitizados, limites de
leitura/escrita e `meta.replayed` fazem parte do contrato executado.

## Migração e recuperação

`oriens-mcp-work-v1` sucede a revisão P0/P1. O único DDL amplia o CHECK de status
de `creation_receipts` de 201 para 200/201. Criação mantém 201; atualização e
confirmação de exclusão usam 200. Nenhuma tabela nova foi criada e nenhum arquivo
de migração histórico foi modificado; não há novo ledger ou reprocessamento de dados.

O runner comprovou aplicação, repetição, recusa de drift, rollback integral por
falha deliberada e selo final do catálogo. Rollback de aplicação mantém o schema
aditivo e os recibos/tombstones; não estreitar o CHECK com recibos 200 existentes.
O procedimento com alvo explícito está no README. Nenhum banco compartilhado foi
alterado e não houve deployment.

## Provas executadas

- Java 17 real (`maven:3.9.9-eclipse-temurin-17`, Temurin 17.0.15) e PostgreSQL
  15.19 descartável: 31 testes executados, zero falhas/erros. Dois casos opcionais
  de cliente/navegador foram omitidos nessa execução em container.
- Rodada no host com clientes reais: 32 testes executados, zero falhas/erros;
  somente o caso opcional de navegador foi omitido.
- Codex CLI 0.167.1: OAuth, descoberta, contexto, criação de tarefa e replay da
  mesma intenção. Um efeito confirmado, `meta.replayed=true` na repetição.
- Claude Code 2.1.325: OAuth, descoberta e criação de tarefa pelo cliente real,
  provocado por fixture Messages determinístico em loopback. Nenhuma inferência
  ou mensagem externa. O JWT do Oriens não foi passado aos clientes.
- O teste verificou exatamente duas tarefas sintéticas após as chamadas dos
  clientes (uma por cliente), incluindo a repetição do Codex.
- Regressões existentes: 16 testes de domínio e 15 REST executados com sucesso
  em PostgreSQL descartável. Dois casos opcionais de navegador das telas antigas
  não foram executados. Não houve alteração de frontend.
- `git diff --check` e checksum da evolução conferidos.

Os testes P2 incluem: catálogo por escopo/redução e chamadas diretas negadas;
IDs de outra conta/fora da allowlist; paginação com 105 objetivos, 108 colunas e
25 tarefas; omissão de nested views; união de recortes e avulsas; contagens do
projeto e do filtro distintas; prazo futuro e planejamento independentes; todos
os tipos de escrita e seus replays; criação sem autoautorização; sobrevivência de
tarefas; exclusão de objetivo; preservação de etiquetas; transferências nas duas
direções com avulsas e entre projetos; origem/destino/âncora negados; precondições,
UUID/Long, coerção, null/ausência, datas, localização e campos desconhecidos;
JSON com propriedade duplicada recusado pelo SDK; texto malicioso tratado como
dado; replay expirado/após exclusão/após redução/revogação; namespaces de duas
conexões e REST; corrida REST × MCP na mesma versão; repetição concorrente;
falha de auditoria revertendo recurso e recibo e nova tentativa com a mesma chave.

A suíte herda as provas P0/P1 de OAuth/renovação, fronteira REST/MCP, revogação
serializada com operação autorizada, edição concorrente de permissões e estado
compartilhado após reinício de instâncias. As invariantes de domínio são também
exercitadas pelo REST e pela suíte canônica existente.

## Reprodução e limites

```sh
python3 oriens-api/ops/mcp-account/test_mcp.py --p2 --java17
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --p2 --clients
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/projects-refactor/test_p1.py
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/projects-refactor/test_p2.py
```

Runners criam e removem seus próprios containers; fixtures e credenciais são
sintéticos. Não configurar clientes pessoais nem transmitir mensagens para
provar o fluxo. MCP continua desabilitado por padrão. Finanças seguem P3; telas,
HTTPS/origins públicos, smoke de publicação e liberação seguem P4.

`design-taste-frontend` foi aplicado para preservar a interface e a divisão de
fases aprovadas. Não houve tela, nova direção visual, imagem ou conteúdo de
produto nesta P2; não se declara inspeção visual de produção nesta entrega.
