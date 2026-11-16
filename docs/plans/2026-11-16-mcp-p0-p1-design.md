# MCP — desenho e execução P0/P1

Contrato: [SPEC aprovada](2026-11-16-mcp-account-spec.md). O usuário autorizou
incluir a P0 como pré-requisito da P1 nesta conversa. A aprovação da SPEC cobre
as decisões de produto e arquitetura; este documento detalha sua execução.

## Processo

1. Contexto: revisados histórico, segurança JWT, serviços, recibos e migrações.
2. Esclarecimento: P0 ausente na branch; usuário confirmou incluí-la.
3. Alternativas: módulo na API (adotado), gateway separado (mais implantação e
   propagação de identidade), bridge local (distribuição fora do escopo).
4. Desenho aprovado: mesmas fronteiras e garantias da SPEC; implementação abaixo.
5. Documentar decisões e evidências reproduzíveis nesta família de documentos.
6. Implementar P0 e P1, sem liberar produção nem ferramentas de escrita.

Brainstorming: abordagem prática sob restrições (padrão 7A de
`brainstorming-skill/references/pattern-categories-and-documentation.md`):

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

Restrições aplicadas: preservar Java 17/Boot 3.5.6 e login; grants com recorte
explícito; usar SDK/framework mantidos, não implementar OAuth/JSON-RPC próprios.

## Responsabilidades e invariantes

- OAuth: framework responsável por validação, código, PKCE e emissão. Extensões
  pequenas para cliente público, callbacks loopback e política de renovação.
- Persistência: PostgreSQL para conexões, allowlist, fluxos, tokens, auditoria e
  contadores. Nenhum estado de autorização depende da memória de uma instância.
- Política: interseção de token e conexão atual; contexto imutável com dono estável.
  Negado por padrão. Revogação e redução serializadas com as operações autorizadas.
- Gestão: JWT normal, dono pelo principal, precondição de versão. Reduções são
  imediatas; ampliações exigem nova autorização e nova conexão.
- Segredos: tokens opacos com lookup por hash; material recuperável do framework
  protegido por biblioteca criptográfica, chave externa, nunca incluído em DTO/log.
- Migração: revisão aditiva sobre `oriens-statistics-v1`, sem versão financeira
  (P3), sem modificar revisões históricas e sem DDL no startup.
- Auditoria: metadados permitidos; sucesso junto da transação; falhas independentes.
- Limites: PostgreSQL, minuto fixo, tamanhos e timeouts limitados.

## Interface e design-taste-frontend

P0/P1 são infraestrutura e API. A experiência completa de integrações e
consentimento é P4. Não criar telas fictícias nem antecipar redesign. Preservar
tipografia, cores, componentes e layout atuais; quando houver interface de prova,
usar exclusivamente conta sintética, estados honestos e controles acessíveis.
Nenhuma inspeção visual é declarada sem execução real.

## Prova e conclusão

Fixar versões resolvidas; compilar com release 17 e executar em Java 17; testar
PostgreSQL descartável, migração/repetição/drift/rollback, OAuth/PKCE, refresh
concorrente/replay, fronteira REST/MCP, conflitos de gestão, dono e revogação entre
instâncias. Registrar separadamente testes automatizados e clientes reais.
Qualquer gate P0 não demonstrado continua pendente: não habilitar produção,
não liberar escritas e não declarar P0 encerrada com evidência substituta.
