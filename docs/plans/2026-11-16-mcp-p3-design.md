# MCP — desenho de execução P3

Contrato: [SPEC aprovada](2026-11-16-mcp-account-spec.md). Desenho aprovado
explicitamente pelo usuário nesta conversa: “aprovo”.

## Processo

- [x] Explorar contexto: finanças REST, scheduler, estatísticas e infraestrutura P2.
- [x] Esclarecer escopo: P3 financeira; experiência de conexões permanece em P4.
- [x] Comparar abordagens: serviço financeiro canônico (adotado), guards apenas
  nos controllers (insuficiente), domínio MCP separado (duplica invariantes).
- [x] Apresentar desenho e obter aprovação explícita.
- [x] Documentar antes de implementar.
- [ ] Implementar e registrar provas reproduzíveis.

Brainstorming sob restrições, padrão 7A da skill (template original):

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

Restrições: mesma stack/login; domínio financeiro compartilhado por REST/MCP;
precisão decimal, histórico/claims preservados; nenhuma implantação nem alteração
de banco compartilhado. Alterações locais P2 são preservadas.

## Serviço, contratos e concorrência

O serviço financeiro existente é dono das validações, versões e locks. Cada
mutação pública usa o ledger durável `creation_receipts`, namespace por canal e
conexão, chave UUID e hash canônico. Alteração/exclusão exigem a versão lida;
replay de exclusão confirma sem exigir o alvo sobrevivente. Após exclusão ou
expiração, recibos de criação/edição não devolvem conteúdo removido.

Locks seguem usuário → conexão MCP (quando aplicável) → lançamento. Scheduler
conserva cobertura → origens, sem inversão com os locks de edição. SQL direto
mantém versão e a resposta reflete o estado confirmado. Claims nunca são apagados
para permitir recriação de ocorrências. Validação de categoria é pelo dono.

Migração aditiva e selada introduz versão inicial zero sem reescrever história
financeira. Clientes REST antigos sem chave/versão falham explicitamente.

## Ferramentas e consultas

Sete ferramentas da seção 10.4, com schemas fechados e projeções explícitas.
Dinheiro MCP é string decimal de duas casas, IDs são strings positivas e patch
preserva ausência versus null. Descoberta/chamada aplicam `finance:*` vigente.
Mutação, recibo e auditoria são atômicos; logs não incluem valores/descrições.

Consultas usam dono/filtros na origem, paginação e ordenação determinísticas.
Resumo reutiliza `FinancialStatisticsService`, snapshot consistente, período
até 366 dias e fim não futuro; composição tem paginação independente. Totais
abrangem todo o filtro, sem comparativos não solicitados.

## Interface

Preservar componentes, paleta, tipografia e navegação. Adaptar formulários,
exclusão e gestão de recorrências para chave estável na repetição da intenção,
versão obrigatória, bloqueio durante envio e recuperação explícita de conflito,
sem sobrescrita automática. Erros próximos da ação, com foco e nomes acessíveis.

Aplicar `design-taste-frontend` como alteração de componentes existentes:
sem nova direção ou redesenho global; comparar capturas da interface financeira
antes/depois em build de produção a 1440/768/390 px. Dados sintéticos apenas.

## Prova

PostgreSQL descartável: REST × MCP na mesma versão; edição/encerramento/exclusão
contra scheduler; precisão/limites; categoria de outra conta; resumos além de
uma página; idempotência concorrente, namespaces, expiração, revogação e rollback
por falha de auditoria. Regressões P2/estatísticas/recorrência. Frontend: testes de
contrato/repetição/conflito, build e navegação por teclado/toque. Registrar limites
e comandos reais na evidência; MCP continua desligado por padrão.
