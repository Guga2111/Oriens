---
name: code-review
description: Revise a correção de todo PR do Oriens, incluindo regressões, testes, consistência entre camadas e manutenção. Registre base, head, achados e lacunas.
---

# Revisão de código

Leia o [fluxo de PR](../../../docs/guides/pull-request-review.md), o
[checklist de clean code](../../../docs/conventions/clean-code.md#11-revisão-de-código--checklist)
e os guias do [AGENTS.md](../../../AGENTS.md) para cada camada afetada.

1. Fixe destino, base de comparação e head. Leia o pedido, o diff e os fluxos
   que chamam o código. Compare o comportamento em ambos os lados e siga o
   contrato até os consumidores quando atravessar camadas.
2. Procure resultados incorretos, regressões em casos de borda, falhas parciais,
   lacunas de testes e complexidade que atrapalhe a correção. Confira build,
   config e documentação quando mudarem o fluxo de entrega. Execute a
   [verificação mínima](../../../docs/guides/setup.md) que distingue o resultado
   esperado de uma regressão.
3. Liste primeiro os achados acionáveis por gravidade, com arquivo e linha,
   efeito para o usuário ou para a operação e uma correção verificável. Informe
   quando o escopo revisado não produzir achados. Registre comandos, resultados
   e limites. Encaminhe o impacto de segurança também a
   [security-review](../security-review/SKILL.md).
4. Revalide mudanças relevantes e entregue os campos do PR definidos no fluxo
   comum, com recomendação para o head atual.
