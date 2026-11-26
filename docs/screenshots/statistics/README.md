# Estatísticas — implementação e evidências

Esta é a validação original da reformulação. A evolução posterior de sequência
com chama vermelha e suas novas provas está em [streak](../streak/README.md).

Validado em 15/11/2026. O [desenho aprovado](../../plans/2026-11-15-statistics-design.md)
contém o diagnóstico, as alternativas e a tabela completa de definições das métricas.

## Resultado

Calendário anual navegável com intensidade auditável, decomposição por tarefa/hábito,
seleção acessível e registros do dia. Planejamento compara a mesma população prevista
com sua conclusão e separa pendências atuais por projeto. Hábitos são um domínio
implementado: cadastro, frequência por dia da semana, vigência, execução/desmarcação,
pausa, edição prospectiva e arquivamento. Financeiro agrega todo o intervalo no servidor,
com receitas/despesas comparadas, resultado, categorias e lançamentos paginados.

| Métrica | Definição operacional |
|---|---|
| Realizações por dia | Tarefas atualmente concluídas por `completedAt` + execuções válidas de hábitos; nunca gastos |
| Dias com registros | Dias do intervalo com pelo menos uma realização; cobertura parcial explicitada |
| Conclusão do planejamento | Não canceladas previstas no intervalo e concluídas até seu fim / não canceladas previstas no mesmo intervalo |
| Hábitos | Execuções / ocorrências previstas pela frequência vigente, vigência e pausas; dias não programados ficam fora |
| Atrasadas hoje | Tarefas abertas com prazo anterior a hoje; estoque atual, independente do período histórico |
| Financeiro registrado | Receitas positivas, módulo das despesas negativas e diferença; não é saldo de conta |

Comparação com intervalo anterior de igual duração; hoje em andamento explicitado.
Taxas variam em pontos percentuais; contagens e resultado financeiro, em unidades
absolutas. Denominador inexistente gera indisponibilidade. BRL com centavos exatos,
`BigDecimal` no backend e strings decimais/`BigInt` na agregação do frontend.

## Provas executadas

| Verificação | Resultado |
|---|---|
| `npm test` no frontend | 26 arquivos, **120 testes passaram** |
| `npx tsc --noEmit` | Passou |
| ESLint dos arquivos TypeScript alterados/novos | Passou |
| `VITE_API_BASE_URL=/api npm run build` | Build de produção passou |
| `python3 oriens-api/ops/projects-refactor/test_statistics.py --browser` | Migração, repetição, preflight, rollback e seal passaram em PostgreSQL descartável |
| Suítes Java desse runner | StatisticsPostgresTest: 8/8; WorkApiPostgresTest: 15 passaram, 2 opcionais ignorados |
| Navegador contra API HTTP real e PostgreSQL | [Resultado](live-browser-results.json): consultas em lote, filtros, paginação, hábitos, teclado, toque e três larguras |
| Navegador com falhas/vazio controlados | [Resultado](browser-results.json): falha parcial preserva outros domínios, ausência não vira taxa zero |
| Controles adicionais no build de produção | [Resultado](controls-results.json): faixa personalizada, janela anual independente, consulta de data, foco, tabela e categorias |
| `inspect.mjs --app`, produção | Claro: 0 FAIL/0 WARN; escuro: 0 FAIL/1 WARN |
| `lint.mjs --app` | 0 FAIL; dois avisos de código explicados abaixo |
| `git diff --check` | Passou |

Não foi executada a suíte genérica completa do Maven. Os dois testes Java ignorados
são provas de navegador preexistentes de P5 e labels, habilitadas por variáveis próprias;
a prova de navegador de Estatísticas foi executada. O build conserva avisos sobre
Browserslist antigo, `duration-[120ms]` e chunk grande já presentes no projeto.

Casos cobertos: reconciliação entre totais/séries/evidências; filtros combinados;
população do planejamento; reabertura/reconclusão/exclusão; bordas inclusivas e fuso;
contagens zero e taxa sem denominador; valor de um centavo; totais além de uma página;
acesso/leitura/escrita entre usuários; frequência histórica; pausas; dias não previstos;
idempotência, versão concorrente e rollback; recorrência ancorada no fim do mês;
execução concorrente do gerador; ocorrência excluída que não reaparece; ativação sem
fabricar passado; invalidação de cache e preservação após falha de atualização.

## Capturas e reprodução

Antes: código do commit `58da631` (apenas o desenho havia sido adicionado), compilado
em diretório temporário. Depois: build de produção desta implementação. Os dois usam
a mesma conta e conjunto **sintético**, gerado pelo [servidor de prova](fixture-server.mjs):
190 dias de tarefas, três hábitos, 65 dias de lançamentos e seis categorias; relógio
fixo em 15/11/2026 às 12h de Recife. Os contratos antigos foram adaptados à sua
semântica original. Os valores das telas de prova não foram inseridos no produto.
O teste HTTP real usa outro banco descartável e relógio de 13/11/2026, deliberadamente
distinto das capturas estáveis. Nenhuma captura representa dados pessoais ou produção.

| Tema | Antes | Depois |
|---|---|---|
| Claro | [1440](before/light/desktop-fold.jpg) · [768](before/light/tablet-fold.jpg) · [390](before/light/mobile-fold.jpg) | [1440](after/light/desktop-fold.jpg) · [768](after/light/tablet-fold.jpg) · [390](after/light/mobile-fold.jpg) |
| Escuro | [1440](before/dark/desktop-fold.jpg) · [768](before/dark/tablet-fold.jpg) · [390](before/dark/mobile-fold.jpg) | [1440](after/dark/desktop-fold.jpg) · [768](after/dark/tablet-fold.jpg) · [390](after/dark/mobile-fold.jpg) |

As imagens `*-page-01.jpg` em cada pasta são folhas com a continuação da página;
foram abertas junto com todas as capturas acima. Medições completas:
[claro](after/light/report.json), [escuro](after/dark/report.json),
[antes claro](before/light/report.json), [antes escuro](before/dark/report.json).

Scripts [browser-proof.mjs](browser-proof.mjs) e [controls-proof.mjs](controls-proof.mjs)
recebem a URL do servidor como primeiro argumento. O runner PostgreSQL provisiona
e remove somente seu container exclusivo. Para reproduzir o inspector com o servidor
da fixture em 4217:

```sh
node /Users/luisgosampaio/.agents/skills/design-taste-frontend/scripts/inspect.mjs --app 'http://127.0.0.1:4217/stats?theme=light' --out docs/screenshots/statistics/after/light --allow palette-cream
```

## Revisão visual e acessibilidade

Direção `achromatic-ledger`, seed **1359349889**, sem redraw; preservados Inter e
tokens creme/vinho/amarelo. A identidade existente prevalece sobre a neutralidade
da direção. O elemento principal é a distribuição anual da atividade. Sem imagens
decorativas, novas bibliotecas, gradientes ou animações de entrada.

Correções das rodadas: largura intrínseca/centralização do shell corrigidas com
largura explícita e rolagem interna; contraste e tamanho das legendas melhorados;
cabeçalhos alinhados com `gap`, evitando margem vertical em composição horizontal;
planejamento anterior passou a mostrar sua população e acesso aos registros;
rótulo final do eixo financeiro ganhou margem; lookup de data devolve foco à célula.

ROUND 3 — leitura final das capturas

- Seen in one second: período, dias com registros e distribuição anual.
- Idea: partir da constância e aprofundar cada domínio com evidência.
- Live thing: calendário selecionável e execução de hábitos persistida na API.
- Layout words: resumo em linha / calendário amplo / planejamento e matriz / barras financeiras e ranking.
- Scores (julgamento, não teste): design 8 · usability 8 · creativity 7 · content 8 → **7,8**.
- Caps: nenhum FAIL; regras de fotografia/movimento de páginas públicas não se aplicam a app screens.
- Três limites visíveis restantes: heatmap ocupa grande parte da primeira dobra móvel;
  matriz exige rolagem horizontal; financeiro fica abaixo da primeira dobra desktop.
  São consequências da janela anual, alvos táteis e separação por domínio; não há
  estouro horizontal da página, controle fictício ou dado cortado sem alternativa textual.

Respostas à crítica de app screens: (1) o resumo e o calendário respondem constância;
(2) bordas compartilhadas e painéis com altura natural; (3) cor aplicada aos dados,
estado e ações, preservando a marca; (4) 30/40 = 75%, contra 30/30 = 100% resulta
−25 pp; hábitos 24+9+3 = 36 e 30+12+5 = 47, 76,6%; receitas 7.410,00 menos despesas
3.829,85 = 3.580,15; categorias expandidas e registros reconciliam; (5) zero, lacuna
e indisponibilidade têm estados distintos; (6) legenda corresponde aos tokens,
receitas/despesas têm nomes e tabela; (7) navegação recolhe e painéis empilham no celular.

Teclado (setas/Enter/Espaço/Escape), foco visível/devolvido e toque foram exercitados
no navegador. Os gráficos têm tabelas e a grade tem nomes com data completa,
decomposição e cobertura. O inspector não apontou falha de contraste; isso não
substitui auditoria formal WCAG nem teste com leitor de tela, que não foi executado.

Exceções explícitas: `palette-cream` mantém a marca. O aviso `colour-sprawl` no
escuro móvel mede 26% de cor, proveniente de células de dados de 44px, não decoração.
Os dois avisos do lint são `01` usado como dia do mês e travessão usado para dado
ausente; não são numeração decorativa ou frase de marketing.

## Referências e limites de dados

[shadcn.io](https://www.shadcn.io/) foi consultado separadamente de shadcn/ui.
[Heatmap solicitado](https://www.shadcn.io/charts/heatmap-default) não abriu diretamente;
o índice aponta [exemplo](https://www.shadcn.io/examples/heatmap-default).
[Heatmap](https://www.shadcn.io/charts/heatmap) e
[galeria](https://www.shadcn.io/heatmap-chart-examples) orientaram semanas, meses,
legenda e navegação; a implementação pequena usa os primitives locais, sem TanStack Charts.
[Barras comparativas](https://www.shadcn.io/charts/recharts/bar-multiple), verificadas
também no [índice atual](https://www.shadcn.io/charts/bar-multiple), orientaram séries
lado a lado. [Barras horizontais](https://www.shadcn.io/charts/recharts/bar-horizontal)
orientaram ranking, acrescido de valores impressos e acesso à evidência.
[Date picker](https://www.shadcn.io/ui/radix/date-picker) orientou seleção de faixa;
apesar do caminho, a referência atual usa Ark, então foi composta com Calendar e
Popover locais, conforme [DayPicker v8](https://daypicker.dev/v8/using-daypicker/selection-modes).

Não foi copiado código externo do shadcn.io, cujo acesso e licença não se confundem
com o [MIT do shadcn/ui](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).
Preservados React 18, Recharts 2.15.4, Tailwind 3 e dependências existentes.

Histórico de tarefas continua recontável: reabrir/excluir retira conclusões e reagendar
altera o planejamento anterior. Não existem snapshots antigos para recuperar. Hábitos
têm histórico somente desde cadastro; ausência anterior ao marco de cobertura não
significa zero. Financeiro representa lançamentos registrados, sem confirmação de
pagamento ou saldo inicial. Recorrência não preenche lacunas anteriores à ativação.

**A migração não foi aplicada a bancos existentes.** Antes de executar este código em
um ambiente com dados, seguir o [runbook](../../../ops/projects-refactor/STATISTICS.md)
com alvo explícito, backup e preflight. Não houve deploy nesta entrega.
