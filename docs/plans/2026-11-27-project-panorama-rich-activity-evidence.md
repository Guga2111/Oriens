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
- Avançar e voltar no calendário. Conferir progresso e os ícones de criação de projeto, objetivo e tarefa, edição de descrição, troca de capa e conclusão de tarefa.
- Alterar o projeto por outra requisição enquanto a edição está aberta. Conferir que o conflito mantém o rascunho e que **Cancelar** preserva o valor salvo.
- Usar Tab nas larguras de 1440, 390 e 320 px nos dois temas. Em cada cenário, a largura da área de conteúdo coincidiu com a largura útil da página e o botão de edição teve foco visível.

## Verificações automatizadas

- O [Playwright](../../apps/client/e2e/visual/project-panorama.spec.ts) cobre o editor em blocos, erro e nova tentativa de salvamento, upload de capa, atividade e recarga nos quatro projetos visuais.
- O [Vitest](../../apps/client/src/__tests__/project-overview.test.tsx) cobre a descrição legada, o estado vazio, o salvamento, a paginação de atividade e o resumo de projeto simples.
- O [teste PostgreSQL](../../apps/api/src/test/java/com/oriens/oriens_api/work/WorkApiPostgresTest.java) cobre versão, 404 de outro usuário, envio idempotente, eventos ordenados, consultas de tamanho constante e a escrita legada após rollback.

## Capa compacta e controles de página

| Viewport | Tema | Versão anterior | Capa compacta |
| --- | --- | --- | --- |
| 1440 × 900 | Claro | [Antes](../screenshots/project-panorama-rich-activity/after-1440-light.png) | [Depois](../screenshots/project-panorama-pagination/after-1440-light.png) |
| 1440 × 900 | Escuro | [Antes](../screenshots/project-panorama-rich-activity/after-1440-dark.png) | [Depois](../screenshots/project-panorama-pagination/after-1440-dark.png) |
| 390 × 844 | Claro | [Antes](../screenshots/project-panorama-rich-activity/after-390-light.png) | [Depois](../screenshots/project-panorama-pagination/after-390-light.png) |
| 390 × 844 | Escuro | [Antes](../screenshots/project-panorama-rich-activity/after-390-dark.png) | [Depois](../screenshots/project-panorama-pagination/after-390-dark.png) |

O roteiro com `playwright-cli` usou um projeto sintético na API local. A capa mediu 192 px de altura a 1440 e 1920 px de largura, 119 px a 390 px e 96 px a 320 px, sem rolagem horizontal nos dois temas. A comparação usa as capturas da versão anterior, com outro conjunto de eventos sintéticos.

Na atividade, **Anterior** e **Próxima** trocam a lista em grupos de até cinco eventos. Enter avançou e voltou pelo teclado, Shift+Tab moveu o foco visível para **Anterior** e o indicador mostrou a página exibida. Confira a [atividade anterior](../screenshots/project-panorama-rich-activity/after-activity-390-dark.png), a [página 1](../screenshots/project-panorama-pagination/after-activity-page-1-390-dark.png) e a [página 2](../screenshots/project-panorama-pagination/after-activity-page-2-390-dark.png). O teste do cliente também cobre erro e nova tentativa de carregar a segunda página.

## Propriedades na lateral

O Panorama mostra situação, tipo, cor e favorito acima do Resumo. Os dados vêm do detalhe do projeto. Em telas estreitas, os blocos aparecem em sequência depois do conteúdo principal.

| Viewport | Tema | Captura |
| --- | --- | --- |
| 1440 × 900 | Claro | [Antes](../screenshots/project-panorama-pagination/after-1440-light.png) · [Depois](../screenshots/project-panorama-properties/after-1440-light.png) |
| 1440 × 900 | Escuro | [Antes](../screenshots/project-panorama-pagination/after-1440-dark.png) · [Depois](../screenshots/project-panorama-properties/after-1440-dark.png) |
| 390 × 844 | Claro | [Depois](../screenshots/project-panorama-properties/after-390-light.png) |
| 390 × 844 | Escuro | [Depois](../screenshots/project-panorama-properties/after-390-dark.png) |

No Chromium com API local, o roteiro abriu a conta sintética, conferiu os campos com e sem cor, acionou **Favoritar** por teclado no menu e confirmou a atualização no bloco e após recarregar. Conferiu também o estado **Arquivado**, o foco no calendário e a ausência de rolagem horizontal nas larguras de 1440, 390 e 320 px nos dois temas. Ao recarregar o projeto arquivado, o registro de visita aos Recentes retornou o 404 já previsto pelo serviço. As propriedades foram exibidas.
