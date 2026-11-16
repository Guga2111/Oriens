# Diálogo de detalhes da tarefa (kanban)

## Problema

No quadro do projeto, clicar no título de um cartão abria direto o formulário de edição. Não havia
uma visão de leitura: descrição, localização e data de criação não aparecem no cartão e só podiam ser
vistas abrindo o formulário.

## Direção aprovada

O usuário escolheu **Detalhes + Editar**. Clicar em qualquer ponto do cartão abre um diálogo de leitura
com todas as informações da tarefa. O botão "Editar" abre o `TaskEditor` existente. Edição inline no
estilo Trello foi descartada porque duplicaria a validação, o controle de versão e o tratamento de
conflitos que já ficam no editor.

Referências do shadcn.io: os blocos de kanban (Job Applications, Agile Board, Real Estate) mantêm o
cartão curto, deixam os detalhes longos fora do quadro e oferecem "Mover para" por menu. A documentação
do componente Kanban recomenda manter poucos controles reais dentro do cartão e preservar o clique
próprio de botões e links.

## Composição

- **Cabeçalho:** o título da tarefa, com o projeto e a coluna atual como descrição.
- **Linha de estado:** prioridade, estado e etiquetas, usando os badges e vocabulários existentes
  (`PRIORITY`, `TASK_STATUS`, `TaskLabelBadge`).
- **Descrição:** texto completo, com quebras de linha preservadas. Quando não há descrição, aparece
  "Sem descrição." em tom secundário.
- **Detalhes:** uma lista `dl` com rótulo e valor: objetivo (link que abre a aba Objetivos), dia
  planejado e horário, prazo final (marcado "Ultrapassado" no token `negative` quando vencido),
  localização, data de criação e data de conclusão. As datas aparecem por extenso.
- **Rodapé:** "Excluir" à esquerda, com confirmação. À direita ficam "Mover para…" (menu com as outras
  colunas) e "Editar" como ação primária.
- Abaixo de 640 px o diálogo vira `Drawer`, via `ResponsiveDialog`.
- Só shadcn e tokens: Dialog/Drawer, Badge, Button, DropdownMenu, Separator, Skeleton, Alert e
  AlertDialog. Nenhum componente novo foi instalado.

## Responsabilidade e invariantes

- A página do projeto é responsável pelo diálogo e pela URL: `?task=ID` abre os detalhes e permite
  recarregar ou compartilhar o link. Abrir e fechar usam `replace`, para não encher o histórico.
- Os dados vêm de `useTaskDetail` (chave `tasks/detail`, a mesma que `refreshTask` atualiza após cada
  escrita). O snapshot do quadro serve de `placeholderData`, então o diálogo abre na hora e é
  confirmado pelo servidor em seguida.
- O backend já escopa `GET /task/{id}` pelo dono e responde 404 para tarefas de outro usuário. A
  tarefa de outro projeto do mesmo dono mostra "Tarefa não encontrada neste projeto." e não oferece
  ações, porque as colunas do menu pertencem ao quadro atual.
- Mover e excluir usam `useTaskWrites`, com `version` e `projectVersion` vindos do snapshot da tarefa.
  Um conflito mostra o erro com "Recarregar dados".
- "Editar" esconde os detalhes enquanto o editor está aberto. Ao fechar o editor, os detalhes voltam
  com os dados atualizados.
- O cartão inteiro é clicável: o botão do título se estende sobre o cartão (pseudo-elemento), sem
  criar um segundo alvo de foco. Arrastar continua exclusivo da alça, e o menu do cartão mantém
  "Editar tarefa" para quem quer ir direto ao formulário.

## Fora do escopo

Comentários, checklist, anexos e histórico de atividade, que não existem no modelo. A agenda e o
dashboard continuam abrindo o editor, como hoje.

## Verificação

Testes de componente: abrir pelo cartão, deep link carregando do servidor, mover, excluir com
confirmação, tarefa de outro projeto, "Editar" abrindo o editor. Além disso, `npm run lint`,
`npm test` e `npm run build`, e uma checagem visual em desktop e em telefone.
