# Header: verificação visual e funcional

Direção: manter o design do Oriens, com navegação de contexto no shell. Refatoração de componente; sem sorteio de estilo, imagens ou conteúdo novo em produção. O desenho aprovado está em `../../plans/2026-11-16-app-header-design.md`.

## Antes e depois

| Medida | Antes | Depois |
| --- | --- | --- |
| Header | 48 px | 64 px |
| Topo da sidebar | 65 px | 64 px |
| Desnível das bordas no desktop | 17 px | 0 px, expandida e recolhida |
| Breadcrumb no conteúdo | Sim | Não |
| Breadcrumb na barra superior | Não | Sim, com link para Projetos |
| Alvos dos botões da barra | 40 px | 44 px |
| Recuo lateral da header | Padding responsivo da página, até 64 px | 16 px fixos, independente da página |
| Nome longo no breadcrumb do celular | Quebra de linha no conteúdo | Uma linha com reticências |

`before/` contém capturas do estado anterior em desenvolvimento. `after/` foi gerado contra o build de produção, em 1440, 768 e 390 px, incluindo sidebar recolhida em 1440 px. As capturas PNG são a evidência visual principal; `snapshot.html` exporta o DOM e o CSS para a inspeção estática auxiliar (fontes externas podem diferir nesse arquivo).

## Prova

- Build de produção concluído.
- 17 testes direcionados passaram: 7 da header e 10 de diálogos de projetos. Os novos testes verificam consulta compartilhada, renomeação via cache, retorno a Projetos, carregamento, erro e IDs inválidos.
- ESLint dos arquivos alterados: zero erros; permanece o aviso anterior de dependência do effect em NotificationBell.
- Prova em navegador: quatro combinações de viewport/sidebar, sem exceções; bordas alinhadas, um único breadcrumb, sem rolagem horizontal, alvos de 44 px, navegação e abertura/fechamento dos menus de notificações e navegação.
- Lint visual dos componentes: zero falhas e zero avisos.
- Inspetor auxiliar: zero falhas e quatro avisos anteriores sobre a paleta da marca, números do calendário, alturas diferentes dos painéis e espaço no painel Objetivos. A paleta é da marca; os demais dizem respeito ao conteúdo do detalhe do projeto e não à header. `headline-lines` foi permitido porque o título é conteúdo livre do usuário e o teste usa um nome longo; o breadcrumb é truncado. Os relatórios e capturas estão em `.taste-skill/app-header/`, na raiz do repositório.
- Capturas finais abertas e revisadas em todos os tamanhos, incluindo a sidebar recolhida.

## Crítica do componente — uma rodada

1. Contexto: o projeto e o caminho de volta aparecem na barra; o h1 permanece no conteúdo.
2. Geometria: a borda cruza o shell na mesma altura, inclusive com a sidebar recolhida; a marca fica centralizada na faixa.
3. Cor: tokens de marca preservados, sem preenchimento extra nos controles da barra.
4. Consistência dos dados: título e breadcrumb compartilham a consulta de projeto; renomeação se reflete nos dois.
5. Estados: carregamento e indisponibilidade mantêm a navegação; IDs inválidos não geram requisição.
6. Legibilidade: ícones e texto formam uma única linha; nome longo mantém o texto completo no nome acessível e no atributo title.
7. Celular: menu e sino permanecem visíveis; o nome trunca dentro do espaço disponível e o link para Projetos continua acessível.

Dados simulados somente no script de prova: conta `review@example.invalid`, projeto 9 com nome longo e listas vazias. Nenhuma escrita é enviada ao backend. A inspeção usa esses dados para avaliar a geometria, não valida respostas reais do servidor.

Para reproduzir, iniciar o preview do build e executar `node docs/screenshots/app-header/browser-proof.mjs after http://127.0.0.1:4223`.
