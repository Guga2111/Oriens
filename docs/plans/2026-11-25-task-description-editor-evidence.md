# Evidências do editor de descrição de tarefas

Tarefa #101 do projeto Oriens. A revisão compara `dev` em
`d8e3326535762d79ddf2baf88e90ebe3becae0d3` com a árvore de trabalho de
`feat/task-description-as-notion`. As provas usam contas e arquivos sintéticos.
[Decisões e critérios de aceite](2026-11-25-task-description-editor-design.md)

## Verificação

| Comando ou suíte | Escopo comprovado |
| --- | --- |
| `mvn -o -B -Dtest=TaskDescriptionCodecTest test` | 21 casos de conversão entre Markdown e documento, inclusive tabela, mídia, checklist aninhado, listas com vários parágrafos, estilos, marcação literal e limite. |
| `scripts/postgres-tests.sh WorkApiPostgresTest McpP2PostgresTest ProjectWorkPostgresTest` | Migração Flyway, leitura REST/MCP, escrita do editor e do MCP, versões, compatibilidade de recibos e rollback. Upload privado exige dono e vínculo. Leitura assinada cobre expiração, assinatura alterada e Range de WebM. |
| `mvn -o -B test '-Dtest=!McpP2PostgresTest,!McpP3PostgresTest,!McpP4PostgresTest' -Dsurefire.failIfNoSpecifiedTests=false` | 120 casos passaram. Outros 92 exigem PostgreSQL ou ativação específica. |
| `npm test -- --maxWorkers=4` | 374 casos passaram, incluindo abertura do painel e leitura de descrições legadas. |
| `npm run lint` e `npm run build` | Lint com avisos e zero erros. O bundle de produção foi gerado. O editor e o Mermaid são carregados sob demanda. |
| `playwright test --config=playwright.visual.config.ts task-description` | 24 casos passaram, com menu, atalho de checklist, formatação, alça, reordenação com teclado, Esc, limpeza da descrição, falha de rede, conflito, mídia e prévia Mermaid. |
| `npm run test:visual` na imagem Linux documentada | 32 casos passaram, incluindo comparação com as baselines existentes e os cenários novos. |
| `npm audit --include=dev --audit-level=high --json` | Zero avisos de gravidade alta ou crítica. |
| `python3 -B scripts/check-docs-links.py` e `python3 -B -m unittest discover -s scripts/tests -p 'test_check_docs_links.py' -v` | Validação dos links, das âncoras e dos limites documentais. |

## Inspeção de interface

Capturas do painel lateral em 1440×900 e 390×844, temas claro e escuro, em
`output/playwright/task-101/`. A direção usa a composição de trabalho de
design-taste-frontend e os tokens, tipografia e componentes do Oriens.
A inspeção em modo app apontou rótulos da navegação a menos de 16 px da borda
e a sombra da gaveta no tema claro. Ambos são elementos anteriores ao editor.

A checagem adicional `tsc --noEmit -p tsconfig.app.json` retornou os mesmos
diagnósticos em `dev` e na árvore revisada.

O Chromium confirmou a prévia recolhida e expandida, o foco ao abrir e sair,
o destaque de seleção, o movimento por alça e por menu e a renderização do
Mermaid como imagem. As capturas foram produzidas com dados locais sintéticos.

## Revisões

- **Correção.** A revisão seguiu a descrição entre formulários, API, banco e MCP.
  A migração preserva o texto legado e os recibos. A projeção paginada do MCP
  acrescenta uma string armazenada e mantém o número de consultas da listagem.
  O formulário completo só inclui a descrição no PATCH quando ela foi editada.
- **Segurança.** O diff atravessa as fronteiras de conteúdo, disco e delegação MCP.
  A API confere dono e tarefa, valida referências de anexos em lote e exige
  assinatura temporal para servir bytes. O codec mantém HTML como texto e aceita
  links HTTPS. Mermaid gera SVG isolado, sanitizado e exibido como imagem.
- **Publicação.** O ambiente de produção precisa dos requisitos de proxy, do
  volume gravável e do backup conjunto com o PostgreSQL. A prova do proxy real
  acontece na publicação. [Operação dos anexos](../guides/deploy.md#anexos-privados-de-tarefas)

## Tabela, Mermaid e demonstração em dev

Os testes da tabela e do Mermaid reproduziram as duas falhas antes da correção.
No Chromium, oito cenários passaram nos quatro perfis de viewport e tema.
Eles cobrem a inclusão de linha e coluna pelo menu, `Tab` na última célula e
a renderização do diagrama quando `crypto.randomUUID` está indisponível.

`scripts/postgres-tests.sh DataInitializerPostgresTest` confirmou a descrição
estruturada e a preservação de uma conta existente ao reiniciar.
`DataInitializerProfileTest` confirmou a ativação exclusiva do seed em dev.
[Como localizar a demonstração](../guides/setup.md#ambiente-local)

## Ajustes após a revisão em dev

- **Mermaid no servidor de desenvolvimento.** A falha vinha do cache de
  dependências do Vite, gerado antes da instalação do Mermaid. Um servidor
  iniciado com `--force` renderiza os diagramas. O código não mudou.
- **Plugin `lovable-tagger`.** Em `development`, o plugin quebrava a análise do
  argumento de tipo em JSX de `NodeViewContent`. O tipo passou a ser instanciado
  fora do JSX. A suíte visual roda em `--mode visual`, sem o plugin.
- **Rolagem por teclado no painel.** O foco inicial ficava fora da área rolável,
  e o Chromium descartava o foco em cliques na descrição somente leitura. A área
  rolável recebe o foco ao abrir e após esses cliques, preservando a seleção.
  O cenário novo falhava antes da correção e passou nos quatro perfis. A suíte
  `task-description` passou com 36 casos, e `npm test` com 374.
