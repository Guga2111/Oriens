# Evidência — Home de Trabalho

**Data:** 2026-11-24  
**Design:** [proposta aprovada](2026-11-24-work-home-design.md).

## Entrega

- Rota `/home`, item **Início** acima de **Hoje**, breadcrumb e entrada pelo contexto Trabalho.
- Saudação, calendário anual compartilhado com Métricas e consulta das realizações de um dia.
- Links rápidos internos/HTTPS: adicionar, editar e remover com confirmação, até vinte por conta.
- Recentes de tarefas e projetos abertos, até dez, com navegação para o projeto e painel existente de tarefa.
- Visitas explícitas no painel/editor de tarefa e detalhe de projeto; prefetch e leitura da API não registram visitas.
- Cache de recentes atualizado após visitas, edições, exclusões e arquivamentos do domínio.
- Coluna central com padding adicional apenas nesta página; identidade visual e componentes existentes mantidos.
- Dimensões das células do calendário passam a pertencer ao componente, em vez de depender da página de Métricas.

## Backend

Migração aditiva `V11__work_home.sql`, testada com todas as migrações anteriores em PostgreSQL 15
**descartável**; nenhum banco compartilhado foi alterado.

Tabelas `work_quick_links` e `work_recent_visits`. Chaves estrangeiras compostas de visitas garantem
que tarefa/projeto e visita tenham o mesmo dono; exclusão do recurso remove sua visita. Listagem exclui
projetos arquivados e suas tarefas. Visita não muda versões do domínio. Lock por dono serializa visitas
e limita criações concorrentes; links usam versão otimista e o ledger existente de idempotência.

Contratos de `/work/home` descritos na proposta implementados com DTOs, dono autenticado e erros existentes.
URLs recebem validação de rota/esquema e credenciais; campos textuais rejeitam coerção numérica e JSON
rejeita propriedades desconhecidas. Não há busca de previews ou favicons remotos.

## Verificações

- `npm run lint`: passou, zero erros; 14 avisos preexistentes.
- `npm test`: **48 arquivos, 349 testes aprovados**, incluindo dez testes novos de Home.
- `npm run build`: passou. Avisos existentes de tamanho do bundle e classe de duração Tailwind.
- `JAVA_HOME=…/25-open scripts/postgres-tests.sh WorkHomePostgresTest`: **7 testes aprovados**, nenhum ignorado.
  A prova cobre migração e validação do schema, autenticação, isolamento entre contas, CRUD, versão,
  replay idempotente, validação de URLs/JSON, recentes, exclusão/arquivamento, número constante de
  consultas e concorrência de visitas/criação no limite de vinte links.
- TypeScript do código da aplicação, excluindo `src/__tests__`, passou com configuração temporária que
  estende `tsconfig.app.json`, sem alterar a configuração do projeto.
- `tsc -b` completo continua bloqueado por erros preexistentes em `dashboard-contract.test.tsx`,
  `project-detail-timeline.test.tsx`, `project-objectives.test.tsx` e `today-integration.test.tsx`.
  Nenhum erro apontado nos arquivos desta entrega.
- `git diff --check`: passou.

## Revisão visual

Navegador Orca: desktop 1440 × 1000 e celular 390 × 844, nos temas claro e escuro. Os componentes reais
foram montados com um adapter temporário e dados sintéticos; não são capturas dos dados da conta do
usuário. O adapter, a página de revisão, sua aba e o servidor temporário foram removidos/encerrados.
A integração de dados reais foi provada separadamente pelos testes de backend acima; não foi executada
uma suíte Playwright completa contra a API da aplicação.

No celular, `documentElement.clientWidth` e `scrollWidth` foram ambos **390**; células do calendário
medidas em **44 px**, com rolagem contida. Diálogo de adicionar link inspecionado com campos rotulados;
Escape fecha. Testes cobrem ações de edição, exclusão, validação e repetição de criação com a mesma chave.

Capturas:

- [Desktop claro](../screenshots/work-home/desktop-light.png)
- [Desktop escuro](../screenshots/work-home/desktop-dark.png)
- [Celular claro — topo](../screenshots/work-home/mobile-light.png)
- [Celular claro — links e recentes](../screenshots/work-home/mobile-light-bottom.png)
- [Celular escuro — topo](../screenshots/work-home/mobile-dark.png)
- [Celular escuro — links e recentes](../screenshots/work-home/mobile-dark-bottom.png)

Revisão independente pela skill Impeccable: **ship**, sem bloqueios materiais nas seis capturas.
Detector mecânico apontou somente a fonte Inter preexistente, preservada pela restrição de identidade.
O problema dos rótulos iniciais e da coluna fixa foi corrigido após o retorno do usuário; veja abaixo.

## Estado do repositório

Alterações preexistentes/em paralelo em objetivos, Hoje, sidebar e design system foram preservadas.
Não houve commit, publicação, mudança de autenticação, nova dependência ou alteração do MCP.

## Correção do calendário após retorno do usuário

- Mês parcial inicial é omitido quando não há espaço para separá-lo do mês seguinte.
- Coluna dos dias da semana cobre toda a altura das células, incluindo linhas sem texto e o intervalo
  horizontal; células roladas não aparecem atrás dos rótulos. O canto dos meses recebe a mesma cobertura.
- Removido o padding horizontal negativo do scroller que deixava uma faixa de células exposta à esquerda.
- Teste de regressão para a janela de 25/11/2025 a 24/11/2026 e preservação do rótulo de janeiro quando cabe.
- `npm test -- statistics-interactions.test.tsx home.test.tsx`: 17 testes aprovados.
- Lint: zero erros, 14 avisos existentes. Build aprovado.
- Revisão dos componentes reais em Home e Métricas, com dados sintéticos: 1024 e 900 px (incluindo
  scroller no fim) e celular 390 px. Largura do documento igual à viewport no celular. Coluna fixa
  medida em 31 × 14 px no desktop, inclusive nas linhas sem texto.
- [Desktop corrigido](../screenshots/work-home/calendar-fixed-desktop.png) e
  [celular corrigido](../screenshots/work-home/calendar-fixed-mobile.png).
