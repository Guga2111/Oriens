---
name: oriens-impeccable
description: Use para desenhar, revisar ou refinar telas e componentes do app Oriens, com foco em hierarquia, espaçamento, acessibilidade e interação.
---

# Impeccable para o produto

Leia o [guia de frontend](../../../docs/conventions/frontend.md), os
[design system](../../../docs/conventions/frontend/design-tokens.md), os
[componentes shadcn/ui](../../../docs/conventions/frontend/components.md) e o
[guia de testes da UI](../../../docs/conventions/frontend/tests.md).
Para páginas públicas, use [oriens-design-taste](../oriens-design-taste/SKILL.md).

1. Abra o fluxo real e capture o componente antes da mudança. Identifique a tarefa
   do usuário, a ação principal, os rótulos e o que precisa permanecer visível.
2. Refine hierarquia, espaçamento e densidade usando os componentes e tokens
   existentes. Preserve a identidade vigente e os textos em pt-BR. Confira o
   percurso de teclado, nome acessível, foco, contraste e feedback no contexto
   da tarefa, nos temas claro e escuro.
3. Exercite os estados relevantes (carregamento, vazio, erro, desabilitado ou
   confirmado) com dados sintéticos. Use [oriens-playwright](../oriens-playwright/SKILL.md)
   para inspecionar a matriz. Atualize baselines apenas para mudanças esperadas.

Entregue roteiro de interação, estados verificados, capturas antes/depois, testes
e lacunas por viewport e tema.
