# MCP — desenho de execução P2

Contrato: [SPEC aprovada](2026-11-16-mcp-account-spec.md). Desenho de execução
aprovado pelo usuário nesta conversa em 2026-11-16. Base: `30b4c85`.

## Processo e decisão

- [x] Explorar contexto: P0/P1, transporte, política, recibos, serviços e contratos.
- [x] Esclarecer escopo: P2 cobre projetos, objetivos, quadro e tarefas; telas são P4.
- [x] Comparar abordagens: estender serviços existentes (adotado); domínio paralelo
  para MCP (descartado por duplicar invariantes).
- [x] Apresentar desenho e obter aprovação explícita: “aprovo”.
- [x] Documentar desenho antes da implementação.
- [x] Implementar e registrar [evidência reproduzível](2026-11-16-mcp-p2-evidence.md).

Aplicado brainstorming prático sob restrições, padrão 7A da skill
`brainstorming-skill/references/pattern-categories-and-documentation.md`:

> Generate [number] ideas to [solve challenge] with these hard constraints:
> - Constraint 1: [specific limitation that cannot be violated]
> - Constraint 2: [specific limitation that cannot be violated]
> - Constraint 3: [specific limitation that cannot be violated]
>
> These constraints are MANDATORY, not negotiable.
>
> For each idea generated, explicitly show: How does this work WITHIN these constraints?
>
> Format: Idea | How It Works Within Constraints | What It Enables | Trade-offs

Restrições: mesma stack e login; recorte antes de contar/paginar; serviços atuais
donos das regras; recibo, escrita e auditoria atômicos. Nenhuma implantação ou
alteração de banco compartilhado foi autorizada.

## Responsabilidades

O SDK continua responsável pelo protocolo. O catálogo fechado registra somente
as ferramentas P2 e contexto; descoberta e chamada relêem permissões vigentes.
Schemas fechados validam tipos, IDs decimais, versões, UUIDs, datas e patch
ausente/null. Projeções explícitas não expõem entidades ou identificadores de dono.

Consultas paginadas e agregados pertencem à camada de leitura, com predicados de
dono, allowlist e tarefas avulsas na origem. Sem `tasks:read`, projeto, objetivos
e quadro não consultam nem projetam conteúdo ou contagens de tarefas.

Escritas chamam `ProjectWorkService`. Locks seguem usuário → conexão → projetos
em ordem de ID → tarefa. Movimento é uma única operação, validando origem,
destino, objetivo, coluna e âncora. Exclusões preservam as tarefas sobreviventes.

O mecanismo existente de recibos é generalizado, preservando namespaces e hashes
REST. Namespace MCP inclui conexão e ferramenta. Replays relêem autorização e
existência atuais; exceções de confirmação de criação/exclusão de projeto exigem
revisão de política inalterada. Expiração descarta corpo e conserva tombstone.
Sucesso, recibo e auditoria confirmam juntos; falhas são registradas após rollback.

## Interface e design-taste-frontend

P2 é backend. Preservar tipografia, paleta, navegação e componentes existentes;
não antecipar as telas P4 nem declarar inspeção visual sem mudança de interface.
As regras de app da skill se aplicarão quando a interface de produto for criada.

## Prova

PostgreSQL descartável, testes reais de protocolo e regressões REST/domínio:
listas/totais/nested views, isolamento entre contas/conexões, todos os replays,
projeto criado sem autoautorização, transferência/âncora, versões, exclusões,
redução/revogação concorrentes e rollback por falha de auditoria. Executar os
clientes reais em ambiente isolado quando disponíveis. MCP permanece desligado
por padrão; finanças e liberação seguem P3/P4.
