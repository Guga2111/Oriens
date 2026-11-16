# Header e navegação de contexto

## Direção aprovada

O usuário escolheu a opção 2 (header com contexto) e pediu para retirar o breadcrumb do cabeçalho da página e trazê-lo para a barra superior.

## Composição

- Header e topo da sidebar compartilham uma altura de 64 px, incluindo a borda inferior. A linha continua na mesma posição com a sidebar expandida ou recolhida.
- Menu à esquerda, navegação de contexto ao lado e notificações à direita. Os dois botões têm alvo de 44 px e o mesmo tratamento visual discreto.
- Ajuste solicitado após revisão: a header usa recuo fixo de 16 px, independente do padding responsivo do conteúdo das páginas.
- As rotas principais mostram o nome da seção. O detalhe mostra `Projetos › Nome do projeto`, com link de volta para Projetos.
- O breadcrumb sai do conteúdo do detalhe. O título h1, a descrição, os metadados e as ações continuam no PageHeader.
- Em telas estreitas, o nome longo é truncado em uma linha; menu, link para Projetos e notificações continuam acessíveis.

## Responsabilidade e invariantes

A barra superior é responsável pelo breadcrumb, usando os componentes existentes e a rota atual. O nome do projeto vem de useWorkProject, que compartilha a chave e o cache da página: sem estado espelhado nem novo endpoint. Carregamento e erro não mostram o nome de outro projeto. IDs inválidos não disparam consulta. Uma variável de geometria compartilhada impede divergência entre as alturas.

Manter os tokens de marca, a fonte, o shell persistente, as rotas e os comportamentos existentes. É uma refatoração de componente, sem sorteio de direção nem reformulação do restante do app.

## Etapas

1. Explorar contexto — concluído: header de 48 px, topo da sidebar de 65 px e breadcrumb local no detalhe.
2. Esclarecer escopo — concluído: opção com contexto escolhida.
3. Comparar abordagens — concluído: discreta versus com contexto; usuário escolheu contexto.
4. Validar desenho — concluído: seleção explícita e pedido de mover o breadcrumb.
5. Registrar desenho — este arquivo.
6. Implementar e verificar — comparar capturas antes/depois; conferir desktop expandido/recolhido, tablet, telefone, nomes longos, navegação e atualização do cache; build e testes pertinentes.
