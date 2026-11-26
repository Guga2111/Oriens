# Explorar — evidência da refatoração

Implementação da opção A da [SPEC aprovada](2026-11-24-explorar-design.md). As duas abas usam a mesma composição de busca, filtros, grade, lista e paginação. O print orientou a geometria da tabela. As capturas usam a tipografia, os tokens e os campos do Oriens.

## Comparação visual

Medições em pixels CSS, com a grade de Tarefas na viewport de 1440 × 900. A referência tem 1598 × 445 px. O recorte do Oriens mostra o cabeçalho e nove linhas simples, como no print.

| Medida | Referência | Oriens |
|---|---:|---:|
| Cabeçalho | 45 px | 44 px |
| Nove linhas simples | 44 px cada | 44 px cada |
| Divisórias internas | 1 px | 1 px |
| Primeira coluna | 410 px | 408 px |

Descrições, etiquetas e títulos que quebram em mais de uma linha aumentam a altura da linha. A grade de Projetos também tem cabeçalho de 44 px. Ambas as abas foram verificadas em 1440, 1280, 1100, 1024, 768, 390 e 360 px, com rolagem horizontal contida. Ao redor da transição da sidebar, 1100 px de viewport deixaram 678 px úteis e renderizaram a lista. Em 1024 px, a sidebar recolhida deixou 926 px úteis e acomodou a grade.

- [Recorte medido de Tarefas](../screenshots/explorar/tasks-table-crop.png)
- Desktop claro e escuro em [Tarefas claro](../screenshots/explorar/tasks-1440-light.png), [Tarefas escuro](../screenshots/explorar/tasks-1440-dark.png), [Projetos claro](../screenshots/explorar/projects-1440-light.png) e [Projetos escuro](../screenshots/explorar/projects-1440-dark.png).
- Celular claro e escuro em [Tarefas claro](../screenshots/explorar/tasks-390-light.png), [Tarefas escuro](../screenshots/explorar/tasks-390-dark.png), [Projetos claro](../screenshots/explorar/projects-390-light.png) e [Projetos escuro](../screenshots/explorar/projects-390-dark.png).
- [Sheet de filtros em 390 px](../screenshots/explorar/tasks-390-filters.png)
- [Busca expandida em 390 px](../screenshots/explorar/tasks-390-search.png)
- Estados de [carregamento](../screenshots/explorar/tasks-loading.png), [erro](../screenshots/explorar/tasks-error.png) e [busca sem resultados](../screenshots/explorar/tasks-empty.png).

## Verificações

- Playwright CLI no build de produção, com dados sintéticos. Verificou as duas abas, geometria, busca, filtros de status, período e projeto, paginação, favorito, arquivar, desarquivar e retorno do foco após fechar o Sheet. Simulou falha na consulta e verificou nova tentativa e limpeza dos filtros.
- Playwright com a API de desenvolvimento em `all-data.spec.ts`. Cinco testes passaram em desktop e celular. O sexto é a variante desktop de um teste exclusivo para celular e foi ignorado pelo próprio teste. A tarefa de prova usa data planejada e chave de idempotência exigidas pela API.
- `npm run lint` passou com 14 avisos preexistentes. `npm test` passou com 375 testes. `npm run build` passou. A checagem TypeScript da aplicação passou. O `tsc` com a suíte inteira ainda encontra erros preexistentes em arquivos de teste.
- O detector do Impeccable e o lint de Design Taste Frontend não encontraram ocorrências nos arquivos revisados. O inspector sinalizou a margem dos rótulos no trilho compartilhado. Com esse aviso de escopo excluído, registrou zero falhas em 1440, 768 e 390 px. O aviso restante em Projetos corresponde ao espaço abaixo dos quatro registros do cenário de teste.

## Controles compactos no breadcrumb

As capturas mostram a lupa de Hoje e o ícone de filtros de Projetos compartilhados em Explorar. O Playwright mediu os controles de 320 a 1440 px, com o cabeçalho em uma linha. A lupa anima a largura em 200 ms, abre com foco no campo e recolhe com Escape, devolvendo o foco ao botão. A preferência por movimento reduzido elimina a transição. A troca de aba, os fluxos de busca e filtros e os estados foram verificados novamente. Os 15 testes focados passaram, assim como lint e build.

## Alinhamento e ordenação

- Em 1440 px, o Playwright mediu até 0,5 px de diferença entre o início do cabeçalho e a margem interna da célula. O título e as duas etiquetas da linha de prova ficaram lado a lado. [Recorte da grade](../screenshots/explorar/tasks-table-crop.png)
- O cabeçalho manteve o foco ao ordenar por teclado. A seleção voltou à primeira página e alternou `aria-sort`. Em telas estreitas, o menu **Ordenar** deu acesso aos campos da lista. [Ordenação por prioridade](../screenshots/explorar/tasks-1440-sorted.png) · [Menu no celular](../screenshots/explorar/tasks-390-order.png)
- `WorkApiPostgresTest` executou 19 testes aprovados e 2 casos condicionais ficaram desabilitados. A suíte confirmou ordem por domínio, paginação no servidor, isolamento por dono e ordenação por descrição de projetos. O desempate usa o ID em ordem crescente. As capturas usam dados sintéticos.
