# Refatoração do detalhe de projeto

Direção aprovada pelo usuário: reorganizar a tela mantendo a identidade do Oriens.

## Tarefas

- [x] Explorar implementação, componentes, dados e alterações locais.
- [x] Esclarecer escopo visual e restrições.
- [x] Comparar reorganização, polimento da disposição atual e mudança de identidade.
- [x] Apresentar desenho e obter aprovação explícita: “Curti, pode implementar”.
- [x] Documentar o desenho aprovado.
- [x] Implementar com componentes shadcn existentes.
- [x] Verificar comportamento, build e resultado visual.

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


## Resultado e prova

- Implementação concentrada em `ProjectDetailPage.tsx` e variante `line` em `components/ui/tabs.tsx`; as outras telas mantêm a variante padrão.
- Desenho aprovado registrado no commit `7e1d6de`; implementação deixada no working tree para revisão.
- 7 testes existentes aprovados (datas locais, diálogos e índices de objetivos); TypeScript sem erros; build de produção aprovado.
- ESLint dos dois arquivos: zero erros e um aviso preexistente sobre a dependência de `fetchProject` em `useEffect`.
- Lint visual em modo app: zero falhas; aviso de sombra da variante padrão preexistente. A variante de linha usada nesta tela tem `shadow-none`.
- Inspeção de produção em 1440, 768 e 390 px, claro e escuro: zero falhas em ambos os relatórios. Todas as 12 capturas finais foram abertas e revisadas.
- Capturas e relatórios: `docs/screenshots/project-detail/after/` e `after-dark/`.
- Conferência adicional no Brave nativo com os dados reais e a capa opcional, antes/depois; conferência móvel a 393 px identificou o ponto de cor isolado acima do título, corrigido nesta entrega.
- A extensão permaneceu sem conexão (`browser access host is unavailable`). A inspeção automatizada usa um navegador separado, build de produção e respostas de API de teste; nenhuma conta real nem alteração no backend participa dessa inspeção.
- Dados da prévia reproduzem os três objetivos da referência, com usuário fictício “Prévia local”, sem capa. São apenas dados de QA; o produto continua carregando os dados da API.

## Crítica final — rodada 2

Pergunta da tela: quais objetivos ainda preciso concluir?

1. A lista de objetivos é o bloco principal; o formulário e as abas antecedem as linhas. O percentual é a figura principal do resumo secundário.
2. Cabeçalho, lista e lateral compartilham as bordas externas; o painel da lista termina conforme seu conteúdo, sem esticar três linhas até a altura do calendário.
3. A identidade preserva o creme e o bordô do Oriens. Cor aparece na identidade do projeto, nos vencimentos e na ação principal.
4. Os três objetivos reproduzidos estão pendentes: 0 concluídos, 0%, nenhum vencido, próximo prazo 21/11. As contagens concordam entre abas, resumo e lista.
5. Zeros continuam explícitos; prazo inexistente continua um traço. Estados vazios usam o componente Empty.
6. O calendário ocupa as sete colunas com espaçamento regular; o dia destacado representa um prazo real dos objetivos.
7. No celular, navegação recolhida, título em duas linhas, inclusão em coluna, abas e objetivos antes do resumo/calendário. O ponto de cor acompanha a primeira linha.

Avaliação visual interna: design 7,5 · usabilidade 8 · criatividade 6,5 · conteúdo 8 → 7,5/10. É uma refatoração funcional dentro da identidade existente; não busca criar uma nova marca.

### Avisos aceitos e limites

- `palette-cream`: identidade existente explicitamente preservada pelo escopo aprovado, em ambos os temas.
- `ragged-row`: lista curta mantém altura natural. A regra de app §4.2 recomenda não esticar painéis sem conteúdo; o espaço fica fora do painel para acomodar futuros objetivos.
- `tabular`: os valores comparáveis do resumo e datas usam números tabulares. O inspetor também conta dias do calendário e títulos numéricos dos objetivos, que não são colunas financeiras ou indicadores dinâmicos alinhados.
- Não houve medição automatizada do antes, pois o navegador separado não possui a sessão real; o antes foi observado no Brave e na imagem fornecida.
- Os fluxos reais de exclusão, arquivamento e favorito não foram executados na conta do usuário. Os testes existentes cobrem diálogos e edição de data; handlers de API foram preservados.
- O build mantém avisos existentes de tamanho de bundle, base Browserslist antiga e classe de duração ambígua, fora do escopo visual.
