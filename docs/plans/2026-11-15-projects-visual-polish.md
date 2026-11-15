# Projetos e agenda — consistência visual

Direção aprovada em 2026-11-15: preservar Horizonte e os contratos P0–P6;
consolidar controles shadcn, formulários, ações e responsividade.

## Inventário e pergunta principal

- Oriens organiza tarefas avulsas e vinculadas a projetos.
- Projetos simples acompanham objetivos; desenvolvimento acrescenta quadro.
- Objetivos têm conclusão manual, independente da conclusão de suas tarefas.
- Tarefas têm planejamento, horário opcional e prazo final independentes.
- Hoje organiza tarefas sem horário e por manhã/tarde/noite.
- Concluídas devem permanecer visíveis junto das tarefas do dia.
- Pendências anteriores e atenção a prazos mantêm as partições do servidor.
- Semana representa plannedDate, nunca dueDate.
- Mutações preservam versões, idempotência, rascunhos e invalidações existentes.
- Uso por mouse, teclado e toque; temas claro/escuro e larguras responsivas.

Pergunta: o que preciso fazer e qual é o contexto de cada tarefa?
A linha do dia e a relação projeto–objetivo–tarefa continuam sendo a identidade.

## Decisões

1. Datas: Calendar + Popover compartilhado, pt-BR, valor yyyy-MM-dd sem UTC.
2. Projeto da tarefa: combobox pesquisável único; preserva opção selecionada,
   busca remota, opção avulsa e feedback de erro.
3. Formulários: FieldSet/FieldLegend e FieldGroup; planejamento separado de prazo;
   limpeza contextual com ícone, sem botões largos vazios.
4. ResponsiveDialog: ScrollArea no corpo, cabeçalho/rodapé fora da rolagem.
5. Hoje: concluídas visíveis por período. A API já seleciona concluídas por
   plannedDate; completedAt permanece a data real da conclusão e não muda a agenda.
6. Semana: grade fluida quando legível, agenda vertical nas larguras menores;
   nenhuma largura mínima que force rolagem horizontal.
7. Objetivos: Checkbox e ações secundárias em DropdownMenu com ícones.
8. Cards: ação principal com ícone, ações secundárias em menu.
9. Kanban: dnd-kit com handle, sensores de ponteiro/teclado e alternativa por menu;
   preservar beforeTaskId, bloqueio de reordenação filtrada e controle de versões.
10. Capa: identificação no card e cabeçalho do detalhe, edição contextual.
11. Estilos: cores e dimensões específicas em index.css, mapeadas no Tailwind;
    espaçamento da escala padrão, sem valores arbitrários nos componentes novos.

## Alternativas avaliadas

Correções locais duplicariam controles. Redesenho completo desviaria da identidade
existente. Adotada consolidação nos componentes responsáveis por cada padrão.
A dependência dnd-kit foi aprovada para substituir o arraste HTML nativo.

## Validação

Registrar neste documento a prova final e os limites efetivamente observados.

## Crítica visual — rodada 1

ROUND 1
Seen in one second: agenda e projetos reconhecíveis, ações mais claras e formulário
com grupos legíveis; a semana mantém seus sete dias sem rolagem.
Idea (one sentence): os períodos de Oriens organizam o trabalho e preservam as
concluídas no contexto do planejamento.
Live thing: concluir/reabrir, escolher datas e mover tarefas pelo mesmo contrato.
Layout words by section: agenda=períodos / semana=grade-agenda / projeto=quadro /
objetivos=lista / editor=grupos.
Scores: design 7.5 · usability 7.0 · creativity 6.5 · content 8.0 → overall 7.2
Caps applied: regras de app; sem exigência de fotografias ou animações decorativas.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Checkbox de objetivo esticado no celular (simple-light/mobile-fold.jpg e
   objectives-light/mobile-fold.jpg). A regra genérica de altura dos botões
   alcançava o Checkbox Radix; excluir role=checkbox e medir largura/altura na prova.
2. Menu semanal muito perto da conclusão (week-light/desktop-fold.jpg).
   Empurrar o menu para a borda oposta e dar área de interação adequada.
3. Corpo do modal tinha altura intrínseca e cortava campos na primeira tentativa
   (round1/editor). ScrollArea usa flex/min-h-0 no viewport; provar scrollTop e
   rodapé visível em vez de confiar apenas na captura.

## Crítica visual — rodada final

ROUND 2
Seen in one second: tarefas do dia preservam o estado concluído; editor separa
vínculos, planejamento e prazo; menus concentram ações sem disputar o título.
Idea (one sentence): os períodos de Oriens organizam o trabalho e mantêm cada
conclusão junto de sua intenção de planejamento.
Live thing: calendário, busca remota de projetos, conclusão e movimentação real
pelo mesmo contrato versionado.
Layout words by section: dia=períodos / semana=grade-agenda / quadro=colunas /
objetivos=lista / formulário=grupos responsivos.
Scores: design 7.8 · usability 8.5 · creativity 6.5 · content 8.5 → overall 7.8
Caps applied: aplicação segue as regras de app; não é um novo site de marketing.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. A semana com dados concentrados em um só dia deixa os outros seis vazios
   (week-light/desktop-fold.jpg). Mantida a distribuição verdadeira por dia, sem
   esticar cartões ou criar conteúdo; esta é uma limitação da densidade dos dados.
2. Colunas Kanban têm cartões com alturas diferentes, proporcionais ao título,
   objetivo e datas (board-light/desktop-fold.jpg). Mantida a leitura sem recorte
   destrutivo; as colunas alinham no mesmo topo e a rolagem fica no quadro.
3. Cards de projetos com conteúdos diferentes têm algum espaço antes da ação
   alinhada ao rodapé (projects-light/desktop-fold.jpg). Mantido o alinhamento da
   ação principal entre pares, sem deslocar resumos nem inventar conteúdo.

Direção: preservada Horizonte; o sheet existente é Editorial greeting, seed
275775847. Não houve novo sorteio ou redraw: o trabalho estende os componentes do
sistema existente. Marca, Inter e tokens de cores foram preservados. Não foram
adicionadas fotografias, imagens externas ou conteúdo de produto fictício.

## Prova e limites

- Vitest: **94 testes passaram**, cobrindo os contratos e as jornadas existentes.
  Atualizados os caminhos de menus, limpeza contextual e concluídas visíveis;
  preservados asserts de versões, payload mínimo, descarte e conflitos.
- TypeScript, ESLint dos arquivos alterados, build Vite de produção e
  `git diff --check` passaram. O build mantém o aviso anterior sobre bundle grande.
- Playwright no build de produção: 360/390/768/1024/1440, claro/escuro, sem erros
  JavaScript e sem overflow da página ou da semana. Prova de ScrollArea com
  scrollHeight/clientHeight/scrollTop e rodapé visível; calendário pt-BR, busca
  remota, capa 3:1, checkbox quadrado e concluídas já visíveis.
- Arraste por ponteiro, reordenação por teclado com anúncios aguardados e
  movimentação filtrada observam o PATCH na fronteira HTTP. Confirmados coluna,
  beforeTaskId e versão. Drop fora do quadro cancela; a detecção prioriza o cartão
  sob o ponteiro sobre o contêiner que o envolve.
- A largura do combobox acompanha o trigger em 360/390/768/1440; o token dinâmico
  pertence ao Radix e é consumido diretamente pelo mapeamento Tailwind.
- Inspector: **zero FAIL** nas capturas finais em 1440/768/390. Todas as imagens
  listadas foram revisadas por folhas de contato; capturas adicionais de
  calendário, rolagem, menus e capa estão na pasta browser.
- Avisos do inspector mantidos com motivo: bordas seguem os tokens shadcn da
  marca, com menor opacidade nos cards; alturas variáveis refletem o conteúdo de
  tarefas e painéis de funções diferentes; espaço antes de rodapé alinha ações;
  dias vazios permanecem vazios; ícones detectados como decoração são controles
  reais de navegação/conclusão. Numeração tabular está aplicada no contêiner do
  detalhe, embora o detector do calendário do projeto simples não a reconheça.
  A sombra indicada pelo lint pertence somente ao DragOverlay, que está flutuando.
- Os únicos allowances são a paleta cream aprovada e, nos modais, o fundo inerte
  coberto e a sombra da superfície flutuante. Contraste não recebeu exceção.
- QA usa os projetos sintéticos Site pessoal, Aprender fotografia e Ideias para
  escrever e uma imagem SVG explicitamente chamada Capa de QA. Nenhum desses
  dados foi adicionado ao produto; não há migração, deploy ou escrita na conta.
- Upload de arquivos contra o armazenamento real e busca externa do Google Maps
  não foram exercitados. Seus contratos foram preservados; esta revisão não
  altera backend, autorização, formato dos arquivos ou limite de upload.

[Evidências e reprodução](../screenshots/projects-polish/README.md).
As regras duráveis foram incorporadas à SPEC frontend, seção 21.

## Correção posterior — foco do seletor de projeto

A revisão inicial deixou passar o ring global no input interno do CommandInput.
Isso desenhava uma borda deslocada após a lupa. Corrigido no componente shadcn
compartilhado: foco inset no contêiner completo, input sem segundo ring e sem
raio próprio, ícone com espaço consistente e largura flexível com min-w-0.

Build, TypeScript, ESLint do componente e diff-check passaram. No navegador,
verificados foco visível único, ausência de overflow e busca/seleção por teclado
em 360/390/768/1440, claro/escuro. Capturas search-focus em browser/. O padrão de
foco em controles compostos foi acrescentado à SPEC, seção 21.
