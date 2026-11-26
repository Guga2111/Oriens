# Explorar — grade compacta de tarefas e projetos

**Status:** aprovado na conversa, opção A.

## Direção visual

A tela `/all-data` usa o breadcrumb para identificar Explorar e mantém um `h1` acessível. As abas Tarefas e Projetos usam a variante de linha do Oriens. A busca e o filtro usam os ícones compactos à direita do breadcrumb. A lupa expande o campo de busca com a animação de Hoje. O filtro usa o indicador de filtros ativos de Projetos.

O print aprovado define a densidade e a geometria da grade. O cabeçalho tem fundo tonal e as divisórias horizontais e verticais usam a borda semântica. Cabeçalhos e valores partem da mesma margem esquerda em cada coluna. A meta para cabeçalho e linhas simples é 44 px, com crescimento quando houver descrição, etiquetas ou títulos longos. A grade ocupa a largura útil, com a coluna de identidade flexível. Paleta, tipografia, espaçamentos e foco vêm do design system do Oriens.

O bloco [Tables Actions do shadcn.io](https://www.shadcn.io/blocks/tables-actions) foi considerado como alternativa mais espaçada. A implementação usa os primitivos shadcn presentes no Oriens.

## Composição e comportamento

- **Tarefas:** título e etiquetas com um divisor na mesma linha quando houver espaço. Quando o título e as etiquetas excedem a largura disponível, o grupo pode quebrar. A descrição fica logo abaixo. A grade também mostra status, prioridade, planejamento, prazo e horário. Status e prioridade reutilizam ícones e vocabulário do domínio. Projeto, status, prioridade e período continuam filtráveis.
- **Projetos:** nome e cor do projeto, descrição quando houver espaço, contagem de objetivos e tarefas, status, favorito e menu. O menu preserva favoritar, arquivar e desarquivar. O link **Ver arquivados** continua abrindo `?tab=projects&archived=1`.
- **Busca e filtros:** pesquisar por Enter ou pelo botão mantém o envio ao servidor e volta à primeira página. Filtros avançados ficam num `Popover` no desktop e no `Sheet` abaixo de `lg`. A busca fica fora da sobreposição em todas as larguras. Limpar restaura os filtros e o texto de busca.
- **Responsividade:** grade quando o painel tiver 52 rem de largura útil e lista com os campos prioritários em painéis mais estreitos. A largura útil considera a barra lateral e preserva espaço para o título. Nomes longos podem quebrar sem causar rolagem horizontal na página. Datas e contagens usam números tabulares.
- **Estados:** barra de controles disponível durante carregamento, vazio e erro. Usar `Skeleton`, `Empty` e `WorkFeedback` para carregamento, ausência de resultados e recuperação por nova tentativa.
- **Ordenação:** os cabeçalhos ordenáveis alternam a direção. Na lista estreita, o menu **Ordenar** oferece os mesmos campos disponíveis nessa apresentação. A escolha volta à primeira página e a API ordena o conjunto filtrado antes da paginação. As ordens iniciais continuam sendo data planejada para tarefas e criação para projetos. Prioridade e status de tarefa usam a sequência do domínio. Contagens combinadas e ações de projeto são colunas informativas.
- **Dados:** manter hooks e paginação de 20 itens. As opções de ordenação são validadas no servidor e a leitura segue escopada pelo dono.

## Aceite

- Registrar comparações Playwright da tabela com o print, com medidas de altura, divisórias, alinhamento e proporção das colunas. A geometria serve à comparação, com os dados, tokens e textos do Oriens.
- Conferir as duas abas nos temas claro e escuro e validar a transição entre lista e grade. Revisar títulos longos, estados de dados, navegação por teclado, busca, filtros, paginação e ações de projetos.
- Rodar lint, testes de frontend e build. Registrar as evidências e limitações da verificação.
