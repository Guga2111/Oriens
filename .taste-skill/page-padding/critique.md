ROUND 1 — padrão lateral compartilhado
Seen in one second: títulos e conteúdo com respiro lateral consistente entre telas.
Idea (one sentence): o layout define o gutter das páginas autenticadas e o mesmo token é reutilizado por páginas públicas e modais.
Live thing: rotas, filtros e formulários existentes mantêm suas interações.
Layout words by section: shell=frame / páginas=conteúdo com largura própria / modais=formulários.
Scores: design 7.5 · usability 8.5 · creativity 7 · content 8 → overall 7.8.
Caps applied: nenhum FAIL; revisão de espaçamento em app existente, sem novo sorteio de direção.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. desktop-fold: planejamento e hábitos têm alturas naturais diferentes; preservado o conteúdo e evitado preenchimento vazio no painel menor.
2. mobile-fold: heatmap anual domina a primeira dobra; mantidos o histórico anual e os alvos táteis existentes.
3. desktop-fold: inspector identifica checkboxes como icon-chips; são controles de execução com significado, não ícones decorativos.

Padding lateral: 1rem abaixo de 768px e 2rem a partir de 768px, via --page-gutter e px-page. O layout deixa de forçar margens nos blocos internos; cada página mantém sua largura e seu alinhamento explícitos. Cards, calendários e menus mantêm o padding próprio dos seus componentes.

Verificação: 131 testes passaram, TypeScript e build de produção passaram. 51 verificações no navegador com dados sintéticos cobriram todas as rotas públicas/autenticadas, projeto inválido, Sheet, Dialog, AlertDialog e ResponsiveDialog em 1440, 768 e 390px, sem padding duplicado nem exceções no navegador. Inspector final: 0 FAIL e 2 WARN, ambos justificados acima. Todas as capturas finais foram abertas.

Revisão posterior em 16/11: a prova acima não detectava limites internos de largura em telas largas. A correção e a regressão que medem as bordas reais estão em docs/screenshots/page-frame/. O layout passou a ser dono também do padding vertical; as rotas autenticadas não impõem mais limites de largura próprios.
