# Evidência do Panorama com descrição rica, capa e atividade

A [spec aprovada](2026-11-27-project-panorama-rich-activity-design.md) descreve a entrega. O Chromium abriu a rota `/tasks/project/:id?tab=overview` com API e PostgreSQL locais isolados e dados sintéticos.

| Viewport | Tema | Primeira entrega | Descrição rica, capa e atividade |
| --- | --- | --- | --- |
| 1440 × 900 | Claro | [Antes](../screenshots/project-panorama/after-1440-light.png) | [Depois](../screenshots/project-panorama-rich-activity/after-1440-light.png) |
| 1440 × 900 | Escuro | [Antes](../screenshots/project-panorama/after-1440-dark.png) | [Depois](../screenshots/project-panorama-rich-activity/after-1440-dark.png) |
| 390 × 844 | Claro | [Antes](../screenshots/project-panorama/after-390-light.png) | [Depois](../screenshots/project-panorama-rich-activity/after-390-light.png) |
| 390 × 844 | Escuro | [Antes](../screenshots/project-panorama/after-390-dark.png) | [Depois](../screenshots/project-panorama-rich-activity/after-390-dark.png) |

No celular, confira a [atividade com as alterações reais do roteiro](../screenshots/project-panorama-rich-activity/after-activity-390-dark.png)
e o [projeto sem capa nem descrição](../screenshots/project-panorama-rich-activity/after-empty-390-dark.png).

## Roteiro com a API local

- Abrir projeto com descrição legada de dois parágrafos, ativar **Editar descrição** por teclado e inserir dois títulos e uma lista pelo editor.
- Salvar e recarregar a rota. Conferir os blocos renderizados, o retorno do foco à ação e o evento na atividade.
- Acionar **Adicionar capa** e carregar uma imagem de teste. Conferir a mesma URL na capa do Panorama, na navegação, em Projetos e na tarefa vinculada. Recarregar e conferir **Trocar capa**.
- Avançar e voltar no calendário. Conferir progresso e atividade de conclusão de tarefa.
- Alterar o projeto por outra requisição enquanto a edição está aberta. Conferir que o conflito mantém o rascunho e que **Cancelar** preserva o valor salvo.
- Usar Tab nas larguras de 1440, 390 e 320 px nos dois temas. Em cada cenário, a largura da área de conteúdo coincidiu com a largura útil da página e o botão de edição teve foco visível.

## Verificações automatizadas

- O [Playwright](../../apps/client/e2e/visual/project-panorama.spec.ts) cobre o editor em blocos, erro e nova tentativa de salvamento, upload de capa, atividade e recarga nos quatro projetos visuais.
- O [Vitest](../../apps/client/src/__tests__/project-overview.test.tsx) cobre a descrição legada, o estado vazio, o salvamento, a paginação de atividade e o resumo de projeto simples.
- O [teste PostgreSQL](../../apps/api/src/test/java/com/oriens/oriens_api/work/WorkApiPostgresTest.java) cobre versão, 404 de outro usuário, envio idempotente, eventos ordenados, consultas de tamanho constante e a escrita legada após rollback.
