# Evidência — shell do plane.so, contextos e densidade

**Data:** 2026-11-23
**Spec:** [fase 2 aprovada](2026-11-23-design-system-plane-so-shell-density-design.md)
**Branch:** `feat/design-plane-shell`
**Dependência:** PR #17 (`feat/design-plane-orange`), ainda aberto durante esta validação.

## Entrega

- Barra superior com logo, notificações e menu da conta existente (perfil, configurações, suporte, tema e saída).
- Trilho com Trabalho, Financeiro, Estatísticas e Configurações; contexto derivado da URL e definido em uma única lista.
- Sidebar estática do shadcn dentro do painel, com navegação própria de cada contexto. Administração aparece somente em Configurações para `ADMIN`.
- Grupo de projetos recolhível, favoritos e links para Quadro, Objetivos e Linha do tempo do projeto aberto.
- Nova tarefa reutiliza `TaskEditor`. Seu estado pertence ao shell, preservando o formulário quando o Sheet mobile fecha.
- Desktop permite esconder a sidebar mantendo o trilho. Abaixo de 1100px, trilho e sidebar abrem juntos no Sheet; mudanças de caminho ou query fecham o menu.
- Controles compactos, gutter de 20px, título de 20px e kanban com colunas de 336px, padding de 8px e cards de raio de 12px.
- Upload do avatar foi movido com o menu, passando por hook e serviço para manter a separação de camadas.

Rotas, contratos, backend, paleta e dependências foram preservados. Na entrega inicial, `ui/sidebar.tsx` não foi alterado; o ajuste da seção final o adapta.

## Provas automáticas

Executadas em `apps/client/`:

| Comando | Resultado |
|---|---|
| `npm run lint` | Sucesso; 0 erros e os mesmos 14 avisos preexistentes |
| `npm test` | 41 arquivos, 244 testes aprovados |
| `npm run build` | Sucesso; também validado com `VITE_API_BASE_URL=http://127.0.0.1:18080` para a API local |
| `E2E_API_BASE_URL=http://127.0.0.1:18080 npm run test:e2e -- shell.spec.ts navigation.spec.ts responsive.spec.ts --workers=2` | 20 aprovados, 10 ignorados intencionalmente por projeto desktop/mobile, 0 falhas |
| `git diff --check` | Sem problemas |

Os 31 testes unitários novos cobrem resolução de contexto (incluindo prefixos parciais), contexto ativo no trilho, ordem de Configurações, isolamento da sidebar, Administração por papel, links e seleção das abas, favoritos, recolhimento e estados de carregamento/erro/vazio.

Os e2e cobrem navegação SPA entre todos os contextos, menu da conta e troca de tema, um único h1 por rota, teclado, geometria, esconder/mostrar a sidebar, abas do projeto, abertura do TaskEditor pelo menu, formulários e listas mobile. Também verificam a transição em 1100px e o Sheet em 1099, 768, 640, 390 e 360px.

A preparação de dados dos e2e antigos foi atualizada para usar `Idempotency-Key`, `plannedDate`, horário com segundos e modo de projeto. Os seletores de diálogos agora usam os nomes e rótulos vigentes.

### Checagens adicionais e ressalvas

- `npx tsc --noEmit -p tsconfig.app.json`: 15 diagnósticos preexistentes de acesso a propriedades de `unknown`, nos testes `dashboard-contract`, `project-detail-timeline` e `today-integration`. Nenhum diagnóstico nos arquivos desta entrega. Esse comando não integra o script `build` atual.
- O build conserva os avisos preexistentes de chunk maior que 500 kB e da classe `duration-[120ms]`.
- O detector visual do Impeccable apontou somente o uso preexistente de Inter. A tipografia está fixada pela spec e não foi trocada.
- A suíte de backend e os demais arquivos e2e não foram executados; esta entrega altera somente o frontend.

## Geometria conferida no navegador

Viewport desktop de 1440 × 900:

| Elemento | Medido |
|---|---|
| Barra superior | 40px |
| Trilho | 60px |
| Painel | x=60, y=40, largura=1372, altura=852; 8px até direita e base |
| Cabeçalho interno | 48px |
| Título da rota | 20px |
| Botão Nova tarefa da sidebar | 32px no desktop; pelo menos 40px no Sheet |

## Revisão visual

Foram registradas e inspecionadas **42 capturas** em [docs/screenshots/plane-shell](../screenshots/plane-shell/): dez telas × dois temas × duas larguras, mais o menu mobile em cada tema.

| Tela | Claro e escuro, 1440px | Claro e escuro, 390px |
|---|---|---|
| Hoje | Conferido | Conferido |
| Semana | Conferido | Conferido |
| Projetos | Conferido | Conferido |
| Projeto: kanban | Conferido | Conferido; coluna selecionável |
| Projeto: objetivos | Conferido | Conferido |
| Projeto: linha do tempo | Conferido | Conferido; rolagem interna |
| Todos os dados | Conferido | Conferido; lista |
| Financeiro | Conferido | Conferido |
| Estatísticas | Conferido | Conferido |
| Configurações, incluindo integração MCP | Conferido | Conferido |
| Sheet de navegação | Não se aplica | Conferido |

Em todas as 40 capturas de rota: um único h1, zero overflow horizontal do documento e zero erros de execução do JavaScript. As listas e o projeto foram revisados com um projeto de desenvolvimento, um objetivo e três tarefas de uma conta local de teste; Financeiro e hábitos mostram seus estados vazios reais. O tema foi alternado pelo menu dessa conta de teste.

Exemplos: [kanban claro](../screenshots/plane-shell/board-light-1440.png), [Configurações escuro](../screenshots/plane-shell/config-dark-1440.png), [menu mobile claro](../screenshots/plane-shell/menu-light-390.png), [linha do tempo mobile escura](../screenshots/plane-shell/timeline-dark-390.png).

As capturas finais usam o Vite local em `localhost:5173` com a API em `127.0.0.1:18080`. A tentativa de captura da prévia estática encontrou o bloqueio de acesso loopback do navegador; o build foi validado separadamente. Não foi feita comparação pixel a pixel com capturas originais do Plane: elas não estão no repositório e o acesso ao host do navegador pessoal estava indisponível. A geometria foi comparada com as medidas registradas na §2 da spec aprovada.

## Ajustes de implementação

- O trilho usa rótulos visíveis abreviados (`Trab.`, `Finan.`, `Estat.`, `Config.`) para caber nos 60px, com o nome completo em `aria-label`.
- O contexto ativo usa `Link` com `aria-current` calculado pela lista de contextos. Assim, Configurações continua ativo em `/support` e `/admin/*`, mesmo tendo `/config` como destino.
- Os subitens de quadro aparecem somente em projetos de desenvolvimento. Projetos simples não têm essas abas; seus links existentes continuam funcionando.
- A largura mobile deriva do trilho mais os 16rem da sidebar e respeita a largura disponível. O breakpoint existente foi nomeado `desktop` no Tailwind.
- O PR fica inicialmente empilhado sobre `feat/design-plane-orange`, para apresentar somente esta fase na revisão. Depois do merge do #17, deve ser redirecionado para `dev`.

Merge e deploy não foram realizados.

## Ajuste após revisão do botão da sidebar

A referência enviada pelo usuário mostrou que a ação principal deveria usar uma superfície branca e uma borda mais suave. O `outline` original usava o fundo cinza do canvas e a borda mais forte dos campos. A variante `sidebar-action` agora usa `bg-sidebar`, `border-sidebar-border` e uma sombra discreta, com hover e tema escuro pelos tokens existentes. A mudança fica restrita à ação principal da sidebar.

Capturas atualizadas desse detalhe: [claro](../screenshots/plane-shell/sidebar-action-light.png) e [escuro](../screenshots/plane-shell/sidebar-action-dark.png). As 42 capturas gerais acima documentam a entrega anterior a este ajuste.

Verificado no navegador: fundo branco no tema claro, borda suave, altura desktop de 32px e tema escuro preservado. Os 10 testes da sidebar, lint (0 erros; mesmos 14 avisos), build e `git diff --check` passaram. Por ser um ajuste visual localizado, os demais testes não foram repetidos.

### Movimento do botão após revisão

A pedido do usuário, a variante `sidebar-action` ficou sem transições e sem encolhimento ao pressionar. O realce de hover muda imediatamente. O e2e de ponteiro verifica ausência de transição e animação no hover e dimensões idênticas durante a pressão: 1 cenário aprovado. Lint e build também passaram, com os avisos preexistentes. Este ajuste é restrito à ação principal da sidebar.

## Ajuste da lista de projetos da sidebar

A lista de projetos passou a seguir o comportamento do Plane:
- **Projeto como seletor.** Clicar no projeto expande e recolhe os subitens, sem navegar. A página abre só pelo subitem: Quadro, Objetivos e Linha do tempo em projetos de desenvolvimento, e "Visão geral" em projetos simples. Um link direto para o projeto já abre o item expandido.
- **Fixar no lugar de favoritar.** A ação usa alfinete (`Fixar`/`Desafixar`, com `aria-pressed`) e o mesmo campo `favorite` da API. Ela aparece no hover ou no foco da própria linha, e fica sempre visível no projeto fixado.
- **Atalho "Criar projeto"** no grupo Projetos. Abre o `CreateProjectDialog` existente pelo shell, funciona com o grupo recolhido e fecha o Sheet no mobile. A rota atual não muda.
- **Hover mais discreto que o item ativo.** O cabeçalho da sidebar ficou sem borda, e o espaçamento dos itens foi alinhado ao botão "Nova tarefa".

### Desvios da spec

- **Token novo `--sidebar-hover`** (claro `210 5% 96%`, escuro `200 4% 11%`). A D9 previa nenhum token de cor novo, mas o `--sidebar-accent` deixava o hover igual ao item ativo. O token é um fundo de interação, definido nos dois temas e mapeado no Tailwind. Contrastes:

  | Par | Claro | Escuro |
  |---|---|---|
  | texto / hover | 17,55 | 13,59 |
  | hover / card | 1,09 | 1,08 |
  | ativo / card | 1,20 | 1,18 |

  O hover fica abaixo do ativo nos dois temas e não carrega informação sozinho, porque o item ativo também tem `aria-current` e peso de fonte.
- **`ui/sidebar.tsx` adaptado**, como permite o frontend.md §1:
  - espaçamento de grupo e itens;
  - `showOnHover` também no `SidebarGroupAction`;
  - ações centralizadas na linha, com 28px no desktop e 40px no mobile;
  - hover pelo token novo.

### Provas

| Comando | Resultado |
|---|---|
| `npm run lint` | 0 erros; mesmos 14 avisos preexistentes |
| `npm test` | 41 arquivos, 248 testes aprovados |
| `npm run build` | Sucesso |
| `E2E_API_BASE_URL=http://127.0.0.1:18080 npx playwright test shell.spec.ts navigation.spec.ts responsive.spec.ts --workers=2` | 25 aprovados, 13 ignorados por projeto, 0 falhas |
| `git diff --check` | Sem problemas |

Na primeira execução, o e2e "atalho da sidebar cria projeto" falhou no mobile: o teste media o alinhamento enquanto o Sheet ainda deslizava (x de −228 contra −227,2). O teste agora espera as animações do Sheet terminarem antes de medir. Depois disso, passou nas 6 de 6 repetições (`--repeat-each=3`, desktop e mobile).

Também conferido no navegador nos dois temas: "+" do grupo no hover, alfinete no projeto fixado, seletor expandindo sem navegar e subitens com linha-guia. Não foram geradas novas capturas no repositório para este ajuste.
