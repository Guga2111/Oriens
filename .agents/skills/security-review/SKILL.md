---
name: security-review
description: Faça a revisão defensiva de segurança de todo PR do Oriens. Comece pelo diff e aprofunde quando uma fronteira de confiança ou integridade de dados for afetada.
---

# Revisão de segurança

Siga o [fluxo de PR](../../../docs/guides/pull-request-review.md). Leia os guias
aplicáveis pelo [AGENTS.md](../../../AGENTS.md) e consulte a
[orientação defensiva da Cloudflare](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md#core-principles)
ao aprofundar a revisão.

1. Identifique destino, base de comparação e head. Leia o diff completo e
   classifique o impacto de segurança com justificativa. Quando o impacto for
   incerto, siga o fluxo afetado até conseguir classificar.
2. Compare a proteção em ambos os lados do diff e siga os chamadores até a última
   decisão confiável. Conforme o escopo, revise [posse e 404](../../../docs/conventions/backend/security.md),
   [REST](../../../docs/conventions/backend/http.md), [MCP e OAuth](../../../docs/conventions/backend/mcp.md),
   dados financeiros, [persistência e migrações](../../../docs/conventions/backend/persistence.md),
   segredos e [permissões do CI](../../../docs/ci-security.md). Siga o dado ou a
   ação desde o ator até o recurso. Use histórico para distinguir introdução,
   regressão e condição preexistente no fluxo alcançado.
3. Confirme cada achado com arquivo e linha, condição necessária, controle
   afetado e consequência demonstrável. Use análise de fonte e testes defensivos
   existentes quando suficientes. Execute código da revisão apenas com
   isolamento, dados sintéticos, recursos limitados e ambiente sem credenciais
   ou acesso à produção. Marque a evidência ausente como validação pendente e
   informe o que falta. Recomende a correção na camada que controla a fronteira.
4. Revalide os fluxos afetados quando o diff ou a base mudar. Use o
   [fluxo de PR](../../../docs/guides/pull-request-review.md) para registrar SHAs,
   impacto, achados, testes e limitações. Entregue um resumo sanitizado com
   recomendação para o PR.
