# Projetos — entrega P5

Hoje e semana integrados aos contratos P3 e ao editor/mutações P4. P6 permanece
pendente. As alterações locais encontradas em Dashboard, useWork e nos testes
foram incorporadas, preservando a troca para DayResponse/RangeResponse.

## Comportamento e responsáveis

O rastreamento encontrou os envelopes novos já disponíveis, mas Hoje ainda só
consumia planned/completed como uma lista por horário. Sem horário desaparecia,
recuperação/atenção não eram apresentadas, e o relógio do dispositivo ainda
controlava a navegação. Não foi criado outro tipo de tarefa ou endpoint.

- DashboardPage usa useTaskDay/useTaskWeek somente na visão ativa. As chaves
  incluem usuário/data/intervalo; respostas antigas não aparecem sob outra data.
  Date e view na URL preservam o escopo ao usar voltar/avançar do navegador.
- As quatro partições vêm do servidor: planejadas, pendentes anteriores, atenção
  e concluídas. O cliente não reclassifica prazos como planejamento. Dias diferentes
  de Hoje não mostram recuperação/atenção; semana consulta somente plannedDate.
- Planejadas são divididas em Sem horário e Manhã/Tarde/Noite. Sem horário usa
  prioridade/ID; horários empatados usam prioridade/ID. Canceladas permanecem fora
  desses conjuntos pelo contrato das leituras. Contagens de cada seção dizem
  quantas tarefas estão nela; o cabeçalho resume o planejamento do dia/semana.
- Concluídas começam recolhidas. Só recebem marcas interativas na timeline quando
  suas linhas estão visíveis. Abrir/fechar é um botão com estado acessível.
- DayLine mantém 06–24, períodos, agora, representação anterior às 06h, clique/foco
  e reduced-motion. Marcas no mesmo minuto abrem um menu com cada tarefa; a faixa
  anterior às 06h também é agrupada porque ocupa a mesma posição. O foco vai à
  linha após o fechamento do menu, evitando a captura pelo focus trap do Radix.
- TaskContext mostra projeto/coluna, link do objetivo e Projeto arquivado, além
  de planejamento e prazo final distintos. Um prazo tem um aviso textual por
  linha. Na grade semanal, o dia do cabeçalho representa o planejamento e o
  contexto fica abaixo da linha principal, usando a largura inteira do cartão.
- TaskPlanningMenu oferece Fazer hoje, Reagendar/Planejar e Retirar do planejamento
  nas duas visões. Reagendar abre o editor único, com o planejamento anterior.
  Fazer hoje envia apenas plannedDate no dia de Recife e startTime=null; retirar
  envia os dois nulos. Prazo/status/vínculos não entram nesses PATCHes.
- useTaskActions usa useTaskWrites, inclusive para status e planejamento. Hooks
  continuam donos das invalidações de dia/semana/quadro/objetivos/contagens. Não há
  refetch duplicado nos callbacks de sucesso da tela. Falha de refetch após escrita
  é anunciada como alteração salva; falha de escrita mantém a linha e retry local.
  Conflito de ação reconsulta as projeções antes de pedir outra intenção explícita.
- O cache work revalida consultas ativas a cada 30 segundos e ao voltar à janela;
  preserva a limpeza por troca de usuário existente. useProductToday acompanha a
  virada de Recife e retorno à aba. productDate serve apenas como portador de dia
  para date-fns, sem conversão UTC das datas de calendário.
- Semana mantém domingo–sábado, sem replicar atenção/pendências, e oferece Revisar
  pendências em Hoje. Desktop mantém grade com rolagem interna e dia selecionado visível; tablet/celular usam
  agenda vertical com dias vazios compactos. Menus/ações móveis têm alvos de toque
  de 44px nas regiões alteradas.

## Prova

- Vitest: 94 testes em 22 arquivos. Inclui contratos de dia/range, respostas fora
  de ordem, partições, vínculos arquivados, PATCH mínimo, invalidação de quadro,
  calendário da semana, foco de marcas coincidentes e virada de Recife.
- TypeScript (tsconfig.app.json), ESLint dos arquivos alterados, build Vite de
  produção e git diff --check.
- Navegador em build de produção: dia, concluídas e semana em claro/escuro,
  1440/768/390/360/1024; sem overflow de página ou erros JavaScript; teclado no menu
  de marcas coincidentes, conclusão recolhida, navegação e planejamento.
- `python3 oriens-api/ops/projects-refactor/test_p2.py --browser`: 13 testes reais
  passaram, incluindo a nova jornada do navegador contra HTTP/JWT/JPA/PostgreSQL.
  Quadro planeja a tarefa; Hoje observa o mesmo ID; editar descrição e concluir em
  Hoje chega ao quadro; mover de volta a A fazer reabre em Hoje; completedAt e prazo
  são conferidos; tarefa avulsa também conclui. A prova usa relógio fixo de Recife,
  inclusive com dispositivo em Pacific/Auckland.
- A opção --browser é explícita: exige build frontend e navegador instalados. A
  suíte PostgreSQL sem essa opção continua disponível. O servidor intermediário
  encaminha todas as operações task/project para a API real; apenas perfil,
  preferências e notificações do shell usam respostas sintéticas. Não prova login,
  upload, mapas externos ou envio de notificações.
- Banco criado em container descartável, baseline validada antes/depois, remoção
  em finally. Nenhum reset de banco compartilhado ou deploy.

[Evidências visuais, reprodução, direção, crítica e ressalvas](../screenshots/projects-refactor/README.md#p5--hoje-integrado).
