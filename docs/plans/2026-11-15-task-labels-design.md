# Etiquetas de tarefas por conta

Escopo aprovado em 2026-11-15: catálogo próprio de etiquetas por conta, com nome e
cor, múltiplas etiquetas por tarefa, criação/edição/exclusão no seletor e exibição
no Kanban e na agenda. São independentes das tags financeiras e de projetos.
A opção por conta foi escolhida frente ao catálogo por projeto, pois também
atende tarefas avulsas e preserva vínculos ao mover ou excluir projetos.

## Comportamento e invariantes

- Nome obrigatório, até 50 caracteres; cores de uma paleta acessível de tokens.
- Catálogo reutilizável da conta; nomes únicos sem distinguir maiúsculas.
- Até 20 etiquetas distintas por tarefa. IDs de outra conta nunca são aceitos.
- Criar etiqueta é idempotente; editar/excluir exige versão atual.
- PATCH de tarefa omite labelIds para preservar e usa [] para limpar.
- Alterar etiquetas de uma tarefa também avança sua versão. Não muda status,
  planejamento, prazo, posição ou projeto.
- Renomear/recolorir atualiza a etiqueta em todas as suas tarefas. Excluir pede
  confirmação, remove apenas vínculos e invalida versões das tarefas afetadas.
- Bloqueios seguem a ordem usuário → projetos → tarefa → etiquetas. Operações
  de etiquetas serializam pela linha do dono, evitando atribuir uma etiqueta
  durante sua exclusão. Leituras usam projeção em lote, sem consulta por tarefa.
- A evolução SQL é aditiva e explícita, verifica o selo anterior e grava uma
  nova revisão. Nunca reescrever baseline.sql/checksum nem resetar banco existente.
- O seletor usa Popover, Input de busca, Checkbox e controles de edição shadcn. Etiquetas
  selecionadas aparecem com texto e cor; a cor não é o único identificador.
- O editor mantém rascunho e conflitos existentes; a aplicação na tarefa só é
  salva junto do formulário. Gerenciamento do catálogo é anunciado como global.

## Validação prevista

PostgreSQL real descartável: migração/repetição/rollback de DDL, isolamento de
contas, idempotência, versões, concorrência, preservação de estado e leituras.
Frontend: seleção múltipla, criar/editar/excluir, payloads e invalidação.
Navegador: dados sintéticos, claro/escuro, celular/desktop e teclado.

A migração será entregue, mas não aplicada a banco compartilhado ou produção.

## Entrega e prova

- PostgreSQL descartável: evolução aditiva, repetição, rollback transacional e
  recusa de drift; vínculos existentes preservados e isolamento por FK composta.
- P1: 16 testes; P2: 17 testes, sem falhas ou skips, com os dois modos de navegador
  `--labels-browser --browser`. HTTP/JWT/JPA reais no ciclo das etiquetas e nas
  regressões de quadro, agenda e projetos de desenvolvimento.
- Frontend: 103 testes, incluindo submissão em portal, rascunhos/conflitos,
  idempotência após timeout, exclusão global e foco inicial no celular.
- TypeScript, ESLint dos arquivos alterados e build de produção aprovados. O build
  mantém o aviso preexistente de bundle grande.
- Navegador: seleção/criação/edição/exclusão em 1440, 768, 390 e 360px nos dois
  temas; nome sem espaços no limite de 50 caracteres conferido em 360px.
- Inspector sobre build de produção: seletor e editor em claro/escuro, cada um
  em 1440/768/390px, com zero FAIL. Todas as capturas finais foram abertas.
  Evidências e reprodução em [task-labels](../screenshots/task-labels/README.md).

As regras reutilizáveis estão na seção 22 da especificação frontend. A revisão
SQL e o procedimento de implantação/rollback estão em
[TASK_LABELS.md](../../oriens-api/ops/projects-refactor/TASK_LABELS.md).
Nenhum banco compartilhado foi alterado.

## Crítica visual final — componentes de app

ROUND 2

Seen in one second: editar tarefa com etiquetas reutilizáveis da conta; criar
etiqueta abre um editor com nome, cor e prévia.

Idea (one sentence): a mesma etiqueta acompanha a tarefa entre projetos e agenda,
com nome legível e uma cor estável.

Live thing: selecionar múltiplas etiquetas, criar/editar o catálogo e excluir com
alcance global explícito.

Layout words by section: tarefa=formulário vertical / seletor=busca e lista /
editor=nome, cores e prévia / ações=rodapé persistente.

Scores: design 7.5 · usability 8.0 · creativity 7.0 · content 8.0 → overall 7.6

Caps applied: convenções de app, sem fotografias ou movimento decorativo;
composição conhecida, criatividade limitada a 7. Mantida a direção existente
Editorial greeting (seed 275775847), Horizonte, sem novo sorteio ou redraw.

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Foco ficava no botão atrás do editor mobile: `editor-light/mobile-fold.jpg`
   agora mostra o foco dentro do nome. Drawer recebe autofocus e o fechamento do
   Popover respeita o novo diálogo.
2. Checkbox perdia proporção com a regra de botões touch: `picker-light/mobile-fold.jpg`
   agora conserva o quadrado e o alvo de toque na linha inteira.
3. Nome sem espaços podia ficar recortado na lista: `browser/long-name-360.png`
   agora quebra no Badge; FieldSet e fieldset do editor permitem reduzir a largura.

Além das imagens, a navegação exercitada revelou submissão de formulário pai pelo
portal e falso aviso de descarte após exclusão global; ambos têm regressões.
Os avisos remanescentes do inspector são bordas dos painéis existentes (claro) e
alturas diferentes de cards do Kanban (ambos): a linha delimita superfícies do
sistema e a altura variável acompanha a quantidade real de conteúdo das tarefas.
As permissões do inspector preservam a paleta Horizonte e as sobreposições reais
dos diálogos/menus; nenhuma falha de overflow foi dispensada. Não há novos assets
ou fotografias. Frontend, Pesquisa, Entrega e Publicação são dados de QA sintéticos.
