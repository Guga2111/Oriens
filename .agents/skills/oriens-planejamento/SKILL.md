---
name: oriens-planejamento
description: Planeje novas entregas do Oriens consultando o objetivo e o backlog pelo MCP. Use para decompor demandas, identificar tarefas equivalentes e registrar trabalho autorizado.
---

# Planejamento pelo MCP

Leia o [AGENTS.md](../../../AGENTS.md), os guias da área pelo [índice](../../../docs/README.md)
e o [contrato MCP](../../../docs/conventions/backend/mcp.md). Use a
[configuração do cliente](../../../docs/mcp.md) se a conexão estiver ausente.

1. Use `oriens_get_context` e localize o projeto autorizado com `oriens_list_projects`.
   Leia os objetivos paginados em `oriens_get_project` e as tarefas do objetivo em
   `oriens_get_board`. Siga `hasNext` e procure termos e sinônimos no projeto com
   `oriens_list_tasks`, inclusive fora do objetivo. Abra o detalhe das candidatas com
   `oriens_get_task` e compare resultado, escopo, estado e aceite, mesmo com títulos
   diferentes. Informe qualquer recorte inacessível antes de concluir sobre duplicatas.
2. Proponha entregas com título, resultado verificável, escopo, referências, dependências,
   ordem e critérios de aceite observáveis. Identifique as tarefas a reutilizar ou atualizar
   pelo ID. Compare alternativas quando mudarem materialmente o resultado. Esclareça
   decisões que alteram o resultado ou precisam de aprovação. Para funcionalidade nova
   de grande porte, prepare a spec datada em `docs/plans/` a partir do
   [template de spec](spec-template.md), com todas as seções, e siga o AGENTS.md.
3. Com autorização para registrar o plano, reaproveite as tarefas equivalentes. Atualize
   com `oriens_update_task` quando houver informação a acrescentar, preservando o conteúdo
   útil. Crie as lacunas com `oriens_create_task` e registre as dependências na descrição
   com os IDs confirmados. Toda tarefa derivada de uma spec versionada abre a descrição
   com o bloco abaixo, ajustando o estado da spec, a branch e os portões da tarefa:

   ```text
   Leitura obrigatória
   Spec <aprovada|em rascunho> em docs/plans/<arquivo>.md, na branch <branch>. Siga a
   seção "Fluxo de entrega": parta dessa branch, abra o PR contra ela e rode code-review
   e security-review antes do PR. <Portão de aprovação da tarefa, quando houver.>
   ```

   Use as versões correntes e a chave UUID do contrato. Em conflito,
   releia e confira duplicatas. Em timeout, repita a mesma intenção conforme o contrato MCP.
4. Releia cada tarefa escrita por ID com `oriens_get_task` e confirme vínculo, descrição e
   versão. Confira o conjunto no quadro. Se uma escrita ficar incerta, identifique a
   pendência e preserve os IDs confirmados.

Entregue objetivo, tarefas reaproveitadas, criadas ou atualizadas, dependências, aceite,
spec quando aplicável e limites de leitura ou escrita. Em ensaios use projeto e conta de
teste com dados sintéticos.
