# Consistência dos controles de hábitos

Revisão de 15/11/2026, mantendo a direção existente `achromatic-ledger` (seed 1359349889), Inter e os tokens da marca. Sem novo sorteio, dependências ou migração de shadcn/DayPicker.

## Diagnóstico e correções

| Antes | Depois |
|---|---|
| Editar, Pausar e Arquivar usavam `ghost` e pareciam texto | `Button` outline com ícones Lucide e nomes visíveis |
| Novo hábito e execução sem ícones | Ícones correspondentes às ações |
| Seis campos de data abriam o seletor nativo | Calendar + Popover locais; cinco campos usam o WorkDatePicker existente e a consulta anual usa Calendar diretamente |
| Seleção dos dias tinha o mesmo fundo do hover | ToggleGroup outline; estado ativo usa primary/primary-foreground inclusive no hover |
| Matriz com largura intrínseca e rolagem horizontal | Janela de dias dimensionada pelo painel, anterior/próximo e intervalo visível; totais continuam abrangendo o período completo |
| Execução da matriz simulava checkbox em botão | Checkbox Radix/shadcn com estado controlado; histórico continua somente leitura |
| Botões do calendário podiam exceder suas células no celular | Cabeçalhos, células e botões têm a mesma largura; navegação mantém o contraste |
| A validação de pausa dependia de campos nativos | Intervalo validado explicitamente antes do envio; limites inclusivos preservados |

Invariantes preservadas: datas locais `yyyy-MM-dd`, sem conversão UTC; execução apenas em dias permitidos; edição prospectiva; arquivamento preserva histórico; chaves de idempotência, versões e invalidação de cache existentes. Datas obrigatórias não podem ser limpas; as opcionais mantêm a ação de limpar.

A busca em `src` não encontrou outros `type="date"`, selects nativos ou cores Tailwind fixas nas estatísticas. Botões de células do heatmap e linhas de evidência continuam HTML semântico com comportamento específico de grade/lista. Inputs de arquivo e de cor continuam nativos nas funcionalidades que precisam dessas APIs do navegador. Cores hexadecimais de projetos/categorias representam dados personalizáveis; não foram substituídas por cores fixas do tema.

## Evidências

O [script](browser-proof.mjs) amplia a prova de estatísticas existente usando somente a fixture sintética local, relógio 15/11/2026 e build de produção. [Resultado: 22 verificações passaram, nenhuma exceção](browser-results.json).

Inclui criação, execução/desmarcação, pausa, edição, arquivamento, consultas em lote, filtros, paginação de lançamentos, toque, teclado, devolução de foco, erro parcial e conta vazia. Nos dois temas e em 1440/768/390px verifica ausência de overflow na matriz, acesso aos 30 dias, limites de data, contraste entre dias selecionados e não selecionados e tamanho das células do calendário.

| Tema | Matriz | Gerenciamento | Calendário | Editor |
|---|---|---|---|---|
| Claro 1440 | [Captura](light-1440-matrix.png) | [Captura](light-1440-manager.png) | [Captura](light-1440-calendar.png) | [Captura](light-1440-editor.png) |
| Claro 768 | [Captura](light-768-matrix.png) | [Captura](light-768-manager.png) | [Captura](light-768-calendar.png) | [Captura](light-768-editor.png) |
| Claro 390 | [Captura](light-390-matrix.png) | [Captura](light-390-manager.png) | [Captura](light-390-calendar.png) | [Captura](light-390-editor.png) |
| Escuro 1440 | [Captura](dark-1440-matrix.png) | [Captura](dark-1440-manager.png) | [Captura](dark-1440-calendar.png) | [Captura](dark-1440-editor.png) |
| Escuro 768 | [Captura](dark-768-matrix.png) | [Captura](dark-768-manager.png) | [Captura](dark-768-calendar.png) | [Captura](dark-768-editor.png) |
| Escuro 390 | [Captura](dark-390-matrix.png) | [Captura](dark-390-manager.png) | [Captura](dark-390-calendar.png) | [Captura](dark-390-editor.png) |

Os 19 testes direcionados passaram (4 novos de controles e 15 de interações/formulários/prazos). TypeScript passou; ESLint dos arquivos envolvidos sem erros (aviso preexistente de exportação de variantes em toggle.tsx). Build passou, conservando avisos preexistentes de Browserslist, duração arbitrária `duration-[120ms]` ambígua entre plugins e tamanho do bundle. Não houve alteração de API/banco nem execução de testes backend.

Inspector `--app`, produção, três larguras:

| Estado | FAIL | WARN |
|---|---|---|
| [Antes, claro](../../../.taste-skill/habits-before/report.json) | 0 | 0 |
| [Depois, claro](../../../.taste-skill/habits-after/light/report.json) | 0 | 2 |
| [Depois, escuro](../../../.taste-skill/habits-after/dark/report.json) | 0 | 3 |

Os avisos `icon-chips` correspondem às marcas funcionais de execução, não a decoração de KPIs. `ragged-row` mede 125px entre planejamento e hábitos: preservadas alturas naturais dos conteúdos para não acrescentar espaço vazio ao painel menor. `colour-sprawl` no escuro móvel mede as células de dados de 44px do heatmap anual. O lint da skill tem 0 FAIL e um aviso: `'01'` é o primeiro dia do mês, não numeração decorativa.

## Crítica visual

ROUND 1 — antes

Seen in one second: estatísticas e atividade anual; as inconsistências dos screenshots do usuário aparecem nos controles abertos.
Idea (one sentence): a programação semanal precisa ser distinguível de sua execução.
Live thing: escolher dias, datas e registrar execuções.
Layout words by section: resumo=linha / atividade=grade / hábitos=matriz / gerenciamento=lista / editor=formulário.
Scores: design 7 · usability 6 · creativity 7 · content 8 → overall 6.8.
Caps applied: regras de fotografia e movimento de páginas públicas não se aplicam à revisão de controles de app.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Imagens 1–2 do pedido: ações sem contorno e calendário nativo; usar os componentes locais.
2. Imagem 3 do pedido: seleção e hover semelhantes; dar preenchimento distinto ao estado ativo.
3. Imagem 5 e capturas antes: matriz excede o painel; navegar por janelas que cabem nele.

ROUND 2 — final

Seen in one second: frequência selecionada com preenchimento, ações com ícones, dias da matriz acessíveis por navegação.
Idea (one sentence): programação e execução usam estados explícitos dentro da identidade existente.
Live thing: navegar por todo o histórico e registrar somente as execuções permitidas.
Layout words by section: resumo=linha / atividade=grade / hábitos=matriz paginada / gerenciamento=lista / editor=formulário.
Scores: design 7.5 · usability 8.5 · creativity 7 · content 8 → overall 7.8.
Caps applied: nenhum FAIL; exceções de app acima justificadas.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. desktop-fold: painéis de alturas diferentes; mantida a altura natural para evitar preencher o planejamento com vazio.
2. mobile-fold: heatmap anual ocupa grande parte da primeira dobra; preservado seu alvo tátil e escopo anual existente.
3. light-390-editor: sete dias quebram em duas linhas; preservada a largura legível dos controles e a navegação por teclado, sem rolagem horizontal.

Todas as capturas de controles e as do inspector foram abertas para revisão. Os dados sintéticos ficam somente na fixture. Sem fotografias, ilustrações ou conteúdo de prova inserido no produto.

Referências oficiais consultadas: [Date Picker](https://ui.shadcn.com/docs/components/radix/date-picker), [Calendar](https://ui.shadcn.com/docs/components/radix/calendar), [ToggleGroup](https://ui.shadcn.com/docs/components/radix/toggle-group), [seleção no DayPicker v8](https://daypicker.dev/v8/using-daypicker/selection-modes).
