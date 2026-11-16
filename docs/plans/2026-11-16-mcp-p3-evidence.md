# MCP — evidência de implementação P3

Data: 2026-11-16. [Desenho aprovado](2026-11-16-mcp-p3-design.md), commit `8ed77fc`.
Contrato: [SPEC](2026-11-16-mcp-account-spec.md).
Resultados sanitizados: [JSON](2026-11-16-mcp-p3-evidence.json).
Operação: [README](../../oriens-api/ops/mcp-account/README.md).

## Entrega

As sete ferramentas financeiras da seção 10.4 estão no catálogo explícito,
com descoberta e execução por `finance:*`. O catálogo completo tem 24 ferramentas,
incluindo contexto. Nenhum acesso financeiro decorre de projetos ou tarefas.
Os schemas são fechados, usam IDs decimais string, dinheiro string com duas casas,
versões e UUIDs obrigatórios. O patch distingue ausência e null.

`FinancialEntryServiceImpl.write` é a fronteira canônica de criação, substituição,
patch e exclusão. Usa `creation_receipts`, sem ledger paralelo. Namespace separa
REST, conexões e operações; recibo e mutação confirmam na mesma transação. No MCP,
a política e a auditoria também pertencem a essa transação. Expiração mantém
tombstones; criação/edição de recurso removido não devolve snapshot; exclusão
repetida reconhece a confirmação original. Revogação/redução precedem replay.

`FinancialEntry` tem versão inicial zero. REST devolve versão e exige UUID em
`Idempotency-Key` em POST/PUT/DELETE, além de `If-Match` forte em PUT/DELETE.
O corpo financeiro contém apenas estado editável, validado por `FinancialCommands.Input`;
DTO de leitura não é entrada de escrita. Cliente antigo sem precondição recebe
428. Conflito recebe 409; chave expirada/recurso removido, 410; lock/timeout
recuperável, 503 com instrução de repetir a chave. Edição consome versão mesmo
sem alteração escalar, usando o padrão de force-increment já presente no domínio.

Categoria é validada pelo dono e por sua regra de negativos. Limites de numeric(12,2),
zero e precisão de centavos foram preservados. Ocorrências automáticas não são
editáveis; origem com histórico preserva início/frequência e não pode ser excluída.
O encerramento usa data final sem apagar o histórico. A ativação da recorrência
passou do UPDATE JDBC a um campo JPA, eliminando a escrita fora do versionamento.

Locks seguem usuário → conexão (MCP) → lançamento. O lock de usuário agora é
`FOR NO KEY UPDATE`: conserva a serialização e permite o KEY SHARE da FK usada
pelo scheduler. A prova força a ordem origem já bloqueada → escritor com usuário
bloqueado → geração, evitando o ciclo que `FOR UPDATE` no usuário causaria.
Scheduler mantém cobertura → origens e incrementa a versão da origem quando
produz ocorrências. Claims sobrevivem à exclusão de uma ocorrência.

O resumo filtrado pertence a `FinancialStatisticsService`. Uma única consulta
SQL calcula receitas, despesas positivas, resultado assinado, quantidade e
composição no mesmo snapshot. A paginação de categorias não limita os totais;
valores agregados podem superar o teto de um lançamento. Listagens aceitam datas
futuras; resumo conserva o período inclusivo de até 366 dias, sem fim futuro.

## Frontend e inspeção

Todos os escritores de lançamentos foram adaptados, incluindo exclusão no
histórico e na gestão de recorrências. As funções de serviço exigem chave/versão
e removem campos de leitura do corpo. O tipo de lançamento lido exige versão;
a entrada de criação possui tipo próprio. Reutilizado `useCreationAttempt` para
conservar chave, payload e precondições em envios incertos. Tentativa expirada ou
em conflito de idempotência não ganha uma nova chave silenciosamente.

Formulários bloqueiam alterações no envio incerto e mantêm o rascunho em erro.
Conflito bloqueia salvar até a recarga explícita que descarta o rascunho; exclusão
mantém a confirmação aberta em falha e exige nova revisão depois de conflito.
A edição usa o drawer responsivo existente e oferece data final na origem recorrente.

Aplicadas brainstorming e design-taste-frontend, preservando o desenho Oriens.
O [registro visual](2026-11-16-mcp-p3-visual.md) contém antes/depois, allowances,
crítica e amostras. Build de produção inspecionado em 1440/768/390: 0 FAIL e dois
WARNs herdados (bordas e espaçamento do gráfico). Nota visual 7,2, sem alegação
de redesenho completo. Todas as capturas finais foram abertas. Lint dos quatro
componentes alterados: 0 FAIL/0 WARN; TypeScript e ESLint dos arquivos afetados passam.

## Provas executadas

- Java 17.0.15 real em `maven:3.9.9-eclipse-temurin-17`, PostgreSQL 15.19
  descartável: 81 testes executados, zero falhas/erros; seis casos opcionais omitidos.
- Rodada no host Java 25.0.2 com navegador: 83 testes executados, zero falhas/erros;
  quatro casos opcionais omitidos. Inclui as provas herdadas P0/P1/P2, finanças,
  OAuth no navegador e E2E financeiro conectado à API isolada.
- Regressões canônicas: 16 testes de domínio, 15 REST e dez de estatísticas/recorrência
  executados. O runner separa os fixtures do scheduler de relógio real dos de relógio fixo.
- Frontend: 154 testes em 30 arquivos passaram, incluindo repetição de payload/chave,
  versão obrigatória, conflitos, zero/limites e invalidação de cache. TypeScript,
  build, lint de app, ESLint direcionado e `git diff --check` passaram.
- E2E financeiro real: a resposta de POST foi perdida depois do commit; repetição
  devolveu o mesmo resultado e havia um único lançamento. A mesma prova em DELETE
  devolveu 204 novamente. Uma alteração externa entre leitura e PUT causou conflito;
  o rascunho foi preservado e só a recarga explícita adotou a nova versão. A data
  final da recorrência foi salva e a navegação/fechamento pelo teclado funcionou.

A suíte P3 verifica: catálogo independente; outra conta/categoria negada;
125 lançamentos além de uma página; paginação de 106 categorias; resumo com
filtros, vazio, período limite e somas acima de numeric(12,2); tipos e dinheiro
inválidos; patches ausente/null; limites positivos/negativos e zero; versões e
replay em cada mutação REST/MCP; namespaces independentes; recibo expirado,
redução/revogação e recurso removido; falha de auditoria revertendo recurso/recibo;
criações concorrentes com uma chave; REST × MCP na mesma versão; scheduler ×
encerramento/exclusão em ambas as ordens; FK concorrente sem deadlock; geração
coerente e claim tombstone sem recriação. As provas P2 herdadas exercitam ainda
isolamento, auditoria, revogação, limites e invariantes de projetos/tarefas.

## Migração e reprodução

`oriens-mcp-finance-v1` adiciona somente `financial_entry.version`, default zero,
NOT NULL e CHECK não negativo. O runner prova aplicação, repetição, drift recusado,
rollback integral de DDL e selo final do catálogo. Um fixture financeiro anterior
à migração conserva todos os campos, valores e claims, recebendo versão zero.
Nenhuma migração histórica foi modificada. Os runners antigos de regressão agora
preparam a cadeia aditiva atual antes do JPA validate.

```sh
python3 oriens-api/ops/mcp-account/test_mcp.py --p3 --java17
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --p3 --browser
npm --prefix oriens-front test
cd oriens-front
npx tsc --noEmit -p tsconfig.app.json
```

Os runners criam/removem seus containers e bancos; todas as contas e credenciais
são sintéticas. A publicação deve interromper escritores antigos antes da troca
coordenada API/frontend. Rollback mantém schema, recibos e tombstones; um escritor
antigo que ignore versão não é rollback seguro para reabrir escritas financeiras.
O README descreve manutenção e recuperação. Nenhum banco compartilhado foi alterado
e nenhum deployment foi feito.

P3 não repetiu os clientes CLI reais: a compatibilidade existente está nas provas
P0/P2; o fluxo completo com ambos os clientes, telas de consentimento/setup,
HTTPS/origins públicos e smoke de publicação/rollback permanecem em P4. Também
não foram executados os três casos antigos opcionais de navegador de estatísticas,
projetos e etiquetas. Não se declara teste manual com leitor de tela; semântica e
nomes acessíveis são verificados pelos testes e navegação de teclado. MCP continua
desabilitado por padrão.
