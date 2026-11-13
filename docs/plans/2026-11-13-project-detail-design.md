# Refatoração do detalhe de projeto

Direção aprovada pelo usuário: reorganizar a tela mantendo a identidade do Oriens.

## Tarefas

- [x] Explorar implementação, componentes, dados e alterações locais.
- [x] Esclarecer escopo visual e restrições.
- [x] Comparar reorganização, polimento da disposição atual e mudança de identidade.
- [x] Apresentar desenho e obter aprovação explícita: “Curti, pode implementar”.
- [x] Documentar o desenho aprovado.
- [ ] Implementar com componentes shadcn existentes.
- [ ] Verificar comportamento, build e resultado visual.

## Desenho

A pergunta principal é: quais objetivos ainda preciso concluir neste projeto?

- Conteúdo centralizado com largura máxima de 1200 px, margens iguais e intervalo de 24 px.
- Objetivos na coluna principal; lateral de 320 px em desktop. No celular, objetivos primeiro.
- Abas compactas com sublinhado, contagens reais e navegação por teclado do Radix.
- Inclusão de objetivo com campo rotulado e ação explícita, preservando o envio por Enter.
- Resumo compacto com percentual, barra de progresso e contagem de concluídos; próximo prazo e vencidos legíveis.
- Calendário ocupando a largura interna do painel, com sete colunas iguais e navegação do mês alinhada.
- Capa opcional preservada, com proporção 16:9.
- Superfícies planas, bordas discretas e tipografia/cores já definidas pelo Oriens.

Referências: https://www.shadcn.io/ui/tabs (Line), https://www.shadcn.io/ui/calendar e https://www.shadcn.io/ui/progress.

## Direção e identidade

Sorteio de referência: Editorial greeting, seed 275775847, com palette/type preservados. Aplicar composição centralizada e números regulares. O título continua sendo o nome do projeto e o shell existente permanece: trata-se de detalhe, não de uma home com saudação. A identidade vem das superfícies e do bordô do Oriens, com a cor pessoal do projeto junto ao título.

Nesta tela, os objetivos e seus prazos tornam-se a lista de trabalho que organiza o projeto. O elemento interativo principal é a conclusão de cada objetivo, já existente.

## Comportamento e invariantes

- A API endereça objetivos pelo índice original em `project.objectives`, nunca pela posição filtrada.
- Progresso continua vindo do DTO; contagens continuam derivadas dos objetivos reais.
- Datas mantêm `parseLocalDate`, sem conversão UTC que altere o dia.
- Preservar inclusão, edição, exclusão, conclusão, reabertura, favorito e arquivamento, com seus estados de envio e erro.
- Preservar as alterações locais preexistentes em componentes compartilhados.
- A implementação usa Radix e react-day-picker v8 instalados; as referências do site não justificam migração para Base UI.

## Verificação prevista

Testes existentes de detalhe e índices, build de produção, inspeção de desktop/tablet/celular e menus/abas. A extensão do navegador está indisponível; tentar novamente e usar Brave nativo como alternativa, registrando a limitação.
