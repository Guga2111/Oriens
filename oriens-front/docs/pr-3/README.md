# PR3 — polish e consistência

Implementa P2.0–P2.7 da SPEC v1.1. Base: `main` após o merge do PR2 (`0fd7874`). Os cinco commits iniciais vieram do OpenCode; os formulários estavam parcialmente modificados no working tree.

## Entregas

- [x] P2.0: semana vertical abaixo de 1024px, listas e filtros em Sheet, DayLine compacta, alvos de toque e Drawers. Playwright verifica dia/semana, Financeiro e Todos os dados, incluindo 360px e altura/overflow dos três Drawers.
- [x] P2.1: seções Aparência, Notificações e som, Integrações e Conta. WhatsApp exibe somente o estado, sem conexão/edição.
- [x] P2.2: canvas de Ajuda, FAQ de compartilhamento com “Em breve”, busca com `aria-controls` e erros inline no contato.
- [ ] P2.3: implementação completa; PageHeader, KpiStrip, mapas de badges, mailto codificado e listas mobile. Testes de componente usam dados simulados em 1440/390. **Aceite visual com conta ADMIN real pendente.**
- [x] P2.4: meio-sol SVG, CTA consistente, composição da landing, captura real de `/tasks` com exemplos em pt-BR, auth com título e erros inline, 404 com Link. Inspector com justificativas abaixo.
- [x] P2.5: Field e associação de erros nos formulários de tarefas, entradas, tags e projetos. O editor de recorrências reutiliza EditEntryDialog; o gerenciamento de recorrências mostra falhas inline. O 403 de tags permanece no formulário e preserva os dados.
- [x] P2.6: removidos App.css, ThemeContext sem consumidores (restava somente o wrapper), toast Radix e hooks sem uso. Sem console.log ou paleta crua nos componentes de aplicação; sem space-y nos arquivos de aplicação tocados.
- [x] P2.7: check de conclusão 0.9→1 em 120ms, hover/press/focus/disabled nos primitivos, proteção global de movimento reduzido e rolagem da DayLine respeitando a preferência. CTAs são links únicos estilizados como botão.

A revisão visual também corrigiu o overflow do contato dos Termos com CSS e o h1 ausente de recuperação de senha. Nenhum texto legal foi alterado.

## Validação

Os logs em [checks/](checks/) registram build, lint, Vitest e Playwright. Os cinco commits herdados foram verificados em cópias temporárias, além de main. Para as cópias, um proxy temporário encaminhou a mesma API de desenvolvimento: o CORS do backend permite somente `http://localhost:5173`. Esse ajuste não faz parte do código entregue.

Os avisos de lint já existentes continuam; não há erros. O build avisa sobre Browserslist antigo e tamanho do bundle. A checagem adicional `tsc --noEmit -p tsconfig.app.json` também foi executada.

Os E2E de admin são condicionais a `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`. O teste de criação real de tag continua `fixme` por BE6; o tratamento de 403 é coberto por teste de componente. Os demais skips separam cenários de desktop/mobile.

[Resultados por entrega](checks/results.md) · [Qualidade estática](checks/quality.md)

## Screenshots e revisão visual

[Índice das 120 screenshots](screenshots/README.md): 15 cenários × 1440/390px × claro/escuro × antes/depois. “Antes” é main; “depois” é esta PR. As telas autenticadas usam uma conta `@oriens.test`, tarefas e entradas fictícias. Admin não está incluído por falta de conta autorizada.

A [auditoria de capturas](visual-audit.json) registra largura, tema, h1 e overflow: após as correções, todos os 60 cenários finais têm um h1, tema correspondente e overflow zero. A cobertura de 360px está no Playwright.

Foram abertos os renders da landing e das telas de Hoje, Financeiro, Termos e recuperação de senha. O problema de quebra de linha dos Termos apareceu nessa revisão e a captura final foi refeita.

## Inspector da landing

Comandos executados com a skill instalada em `~/.agents/skills/design-taste-frontend`:

```sh
node ~/.agents/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:5173/
npm run build
npm run preview -- --port 4173
node ~/.agents/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:4173/
```

[Relatório de desenvolvimento](checks/inspector-dev.md), [produção](checks/inspector-production.md) e [JSON de produção](checks/inspector-production.json). Viewports: 1440, 768 e 390px.

O resultado de produção é **2 FAIL e 2 WARN**, justificados individualmente:

| Regra | Justificativa |
| --- | --- |
| FAIL `few-pictures` | §11.11 pede a captura atualizada do produto. A landing mostra uma captura real de `/tasks`; não foram adicionadas fotos sem relação com a função do aplicativo apenas para alcançar a quantidade genérica da skill. |
| FAIL `still-page` | §9.4 proíbe animações de entrada de página/seção. A interação fica nos controles e na conclusão; a ausência de coreografia de entrada é intencional. |
| WARN `palette-cream` | D2 e §9.1 fixam cream pleno nas páginas públicas. A paleta aprovada tem precedência sobre a heurística genérica. |
| WARN `no-footage` | A SPEC pede demonstração por screenshot. Não há vídeo do produto fornecido; não foi inventada filmagem. |

O WARN `dev-server` aparece na primeira execução e desaparece na validação do build de produção.

## Checklist global — §17.1

- [x] Rotas inalteradas: App.tsx sem diff contra main.
- [x] Sem novos contratos de API: services/ sem diff; telefone aproveita o GET do usuário existente. Nenhuma dependência adicionada.
- [x] Build, lint, Vitest e Playwright aprovados conforme logs.
- [x] Q-T1: navegação da sidebar sem document request (Playwright).
- [x] Q-T2 e Q-T3: zero ocorrências.
- [x] Q-T4: nenhuma variável própria da aplicação sem definição. A comparação literal encontra seis variáveis preexistentes dos primitivos: quatro são injetadas pelo Radix e duas são definidas inline pelo SidebarProvider, conforme quality.md.
- [x] Sem overflow nas rotas públicas e nos fluxos mobile verificados em 360/390; Drawers com rolagem interna e altura máxima.
- [x] Um h1 por rota nos cenários públicos/autenticados exercitados.
- [x] Roteiro de teclado: abrir navegação pelo gatilho com Enter no mobile; alternar com Ctrl+B no desktop; percorrer com Tab até Projetos, verificar foco e seguir com Enter. CTA com foco visível também coberto.
- [x] Claro/escuro conferidos nas capturas das rotas não administrativas.
- [ ] Validação exaustiva de todos os controles/estados em cada rota: fluxos e estados cobertos pelas suítes, mas não foi realizada uma auditoria manual completa de teclado nem dos fluxos administrativos reais.

## Pendências

1. **WhatsAppConnect:** PR extra, bloqueado por BE1 e definição do contrato Q11. Esta PR não implementa fluxo de conexão.
2. **Admin real:** fornecer credenciais via variáveis de ambiente, executar os E2E de admin e capturar 1440/390 claro/escuro. Não marcar P2.3 como aceito antes disso.
3. **BE6:** a criação real de tags continua dependente da correção de autorização no backend. A falha 403 agora aparece inline.
