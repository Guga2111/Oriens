# Projetos — entrega P6: inspeção e preparação de liberação

Preparação implementada e validada em 14–15/11/2026. **Liberação operacional
pendente:** ambiente/host/banco/backup reais ainda não foram informados nem
aprovados. Não houve deploy, reset de banco compartilhado ou exclusão de uploads.

## Rastreamento e alterações

A SPEC e P0–P5 já fixavam o produto e a direção visual. Foi reutilizado o sistema
existente: hooks Query, editor compartilhado, fixtures, roteiros de navegador,
baseline/CLI de banco e testes JPA/PostgreSQL. Não houve novo desenho do produto.
O arquivo RTK.md referenciado nas instruções não foi encontrado no checkout nem
nos diretórios pais pesquisados; nenhuma instrução adicional foi presumida.

Dois bloqueios da P0 persistiam no release: JWT com chave fixa em código e promoção
pública do primeiro ADMIN. Correções na camada responsável:

- JwtConfiguration exige JWT_SECRET externa de pelo menos 64 bytes, sem fallback;
  fornece o mesmo Algorithm à emissão/verificação. Chave ausente/curta impede
  startup; rotação invalida tokens anteriores. Compose de produção/dev e exemplo
  de ambiente foram alinhados. É necessário provisionar uma chave antes de subir.
- Cadastro público copia somente campos de cadastro; serviço força ID novo e USER,
  normaliza email e mantém BCrypt. Papel/ID/associações enviados pelo cliente não
  chegam à persistência pelo cadastro. init-admin é negado, sem promoção pública;
  a primeira conta é USER. Promoção administrativa fica com operador em manutenção.
- WorkApiPostgresTest usa autenticação e serviço de usuário reais, sem mocks desses
  dois caminhos, e prova cadastro malicioso, hash, login, senha incorreta, endpoint
  retirado e token assinado com outra chave. Serviços de armazenamento permanecem
  substituídos para não acessar uploads reais.
- O teste de contexto agora declara H2 e configuração sintética própria; armazenamento
  é mockado e os caminhos MVC apontam ao temporário. Unit de usuário recebeu o mock
  do eventPublisher já exigido pelo serviço. Nada disso muda configuração de produção.

Refinamentos visuais limitados às pendências rastreadas de P5:

- Sidebar recolhe abaixo de 1100 px, com CSS e hook no mesmo limite. Tablet deixa
  de perder 256 px; o Sheet tem título acessível. Navegar por teclado fecha o menu.
- Header usa superfície opaca do tema; removidos blur/transparência de vidro.
- Borda de TaskChip suavizada com token existente. Não há nova paleta, fonte ou
  dependência, nem mudança de datas/status ou implementação paralela de tarefas.

QA agora aceita diretório de saída para preservar evidências P4/P5. Fixture de
planejamento fixa seu relógio sintético na inicialização para não divergir do
próprio dataset após meia-noite. Isso só existe no servidor QA; modo live respeita
relógio do backend/teste. Há scripts P6 de inspeção, estados e ciclo de vida real.

## Prova executada

| Gate | Resultado |
| --- | --- |
| Vitest | 94 testes / 22 arquivos passando |
| TypeScript | tsconfig.app.json sem erros |
| ESLint dos quatro arquivos frontend alterados | 0 erros; 1 aviso de Fast Refresh no sidebar compartilhado |
| Build Vite produção | passou; aviso existente de chunk grande/Browserslist e duration ambígua |
| Maven instalado: mvn -q test | 44 testes executados passando; 27 condicionados a PostgreSQL ignorados nesta invocação |
| PostgreSQL P1 | 13 testes passando, integridade/versões/rollback; selo preservado |
| PostgreSQL P2 + browser | 14 testes passando, HTTP/JWT/JPA/locks/cliente antigo/cadastro/login e jornadas reais |
| Baseline/backup/restore P0 | 11 testes passando, PostgreSQL isolado; nenhum alvo real |
| JAR Spring Boot produção | mvn -q -DskipTests package passou |
| Navegador de produção | Projetos/Hoje/semana, claro/escuro, 1440/768/390/360/1024; sem overflow de página/erros JS nos roteiros |
| Estados adicionais | quadro vazio, dia vazio, só canceladas, menu tablet e conflito 409 preservando rascunho após reload |
| Inspetor APP SCREENS | 18 relatórios / 54 combinações, 0 FAIL, 30 WARN agrupados documentados |
| Lint de design | 0 FAIL; 4 WARN em variantes do sidebar compartilhado |
| git diff --check | passou |

O wrapper ./mvnw esbarrou no cache fora do sandbox; usado Maven instalado.
Mockito precisou de execução local autorizada para attach. A primeira execução
geral encontrou configuração ausente no teste de contexto e o teste de chave
sem isolar ambiente; corrigidos e suíte repetida. O primeiro roteiro Hoje encontrou
fixture do dia anterior após a virada; corrigido o relógio QA e repetido. Não foram
contadas tentativas falhas como aprovação.

A jornada P5 continua quadro → planejamento → Hoje com mesmo ID → edição/conclusão
→ quadro → reabertura → Hoje, incluindo avulsa e foco na timeline. A jornada P6
acrescenta arquivar → editar/concluir tarefa em Hoje → preview/exclusão do projeto
→ mesma tarefa avulsa em Hoje. Tudo em PostgreSQL descartável, dispositivo em
Pacific/Auckland, produto em Recife. O shell de perfil/preferências/notificações
é sintético; as operações task/project chegam à API real.

## Critérios e limites da liberação

AC01–40 têm evidências distribuídas nos testes frontend, P1/P2/P3, jornadas P5/P6
e inspeção. Isso não equivale a executar manualmente cada cenário no ambiente de
produção. AC41 e o mecanismo de AC42 foram ensaiados em banco descartável; restore,
contagens, acesso e autorização **do alvo real** continuam obrigatórios.

O [runbook operacional](../../ops/projects-refactor/RELEASE.md) contém
pré-condições, registro restrito de autorização, backup/restore antes do reset,
instalação separada/idempotente, primeira conta, rotação JWT, smoke tests e rollback
antes/depois de novas escritas. A entrega é revisável sem identificar ou destruir
um banco por suposição. A SPEC permanece com a liberação operacional em aberto.

[Capturas, matriz, crítica, exceções e reprodução](../screenshots/projects-refactor/README.md#p6--inspeção-e-preparação-de-liberação).
Não houve comparação nova com screenshot privado externo ausente deste checkout;
referência rastreável usada foi a timeline preservada em P5. Upload/mapas externos,
email real e infraestrutura pública não foram exercitados. A regressão de API cobre
estatísticas/resumo/jobs; não há inspeção visual exaustiva nova de Finanças/Suporte.
