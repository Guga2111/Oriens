# P4 — experiência MCP e liberação isolada

Data: 16/11/2026. Implementação da P4 da [SPEC](2026-11-16-mcp-account-spec.md),
sobre as entregas P0/P1/P2/P3 presentes no working tree. Nenhuma mudança anterior
foi descartada. O flag permanece desligado por padrão; não houve implantação ou
acesso a banco compartilhado.

## Entrega

- Integrações mantém WhatsApp e acrescenta configuração de Codex, Claude Code e
  requisitos de registro próprio para outros clientes. Copiar não concede acesso.
- Os dois clientes usam configurações públicas produzidas pelo ambiente e pelo
  mesmo formatador da interface, sem senha, secret ou JWT da conta.
- Consentimento real em `/config?mcpFlow=<UUID>`, com JWT no header e cookie
  HttpOnly. Contexto mínimo selecionado; todo dado/escrita/renovação desmarcado.
- Projetos existentes, inclusive arquivados, com nomes; avulsas separadas; ações
  financeiras sobre toda a conta. Dependências nunca adicionam escopo não solicitado.
- Cancelamento, expiração, solicitação inválida e sessão expirada têm estados
  locais. Login mantém `/authenticate`; somente UUID pode retomar uma rota local
  fixa, sem parâmetro de destino livre.
- Gestão mostra estado, autorização/expiração, último uso real, recortes e
  histórico paginado com filtro por resultado. Nome/redução usam um único salvar
  com versão capturada. Conflito preserva rascunho e exige recarga explícita.
- Ampliação orienta nova autorização, que cria outra conexão. A anterior mantém
  seu acesso até revogação. A confirmação de revogação nomeia o objeto e explica
  a preservação de operações/dados recebidos e histórico.
- Estados de carregamento, vazio e erro ficam no bloco correspondente. Teclado,
  foco ao fechar, alvos de toque e textos anunciados usam os componentes atuais.

O backend acrescenta `allowedProjects` (`id`, `title`, `archived`) às projeções de
gestão, com join por conexão e dono. O contrato de escrita e `allowedProjectIds`
permanecem. Não há migração ou dependência P4.

Dois defeitos existentes foram descobertos pelos gates reais e corrigidos na
camada responsável:

1. Os dois instantes calculados separadamente para o histórico padrão excediam
   90 dias por microssegundos. A janela agora usa um único `Instant` e possui
   regressão HTTP sem filtros contra PostgreSQL real.
2. `sendError(404)` de MCP desabilitado despachava `/error` e virava 401 no
   servlet real. A resposta agora fixa o status diretamente e inclui as rotas de
   gestão reservadas. O teste de instâncias independentes cobre esse caminho,
   além do teste de segurança sem configuração/segredo MCP.

## Provas reproduzíveis

```sh
python3 oriens-api/ops/mcp-account/test_mcp.py --p4 --java17
JAVA_HOME=/caminho/do/jdk python3 oriens-api/ops/mcp-account/test_mcp.py --p4 --clients --browser
npm --prefix oriens-front test
```

O runner cria, identifica e remove seu PostgreSQL 15 descartável. Confere
migração, repetição, drift e rollback das revisões anteriores, incluindo claims e
histórico financeiro preservados. Java 17 usa a imagem Maven/Temurin já adotada.
O smoke sobe instâncias independentes com `ddl-auto=validate`, desabilita MCP,
confirma 404 nas superfícies reservadas e login normal, religa e reconhece a mesma
autorização persistida. Não reverte para escritor financeiro antigo nem remove DDL.

Codex CLI **0.167.1** e Claude Code **2.1.325** passam pelo consentimento React de
produção e executam ferramentas autorizadas. Codex usa app-server, sem turno de
modelo. Claude usa fixture Messages determinístico exclusivamente em loopback.
Configurações pessoais não são alteradas; nomes/credenciais temporários são
limpos. O JWT da conta não é herdado pelos processos dos clientes.

O navegador usa duas origens e a API real do módulo. Somente perfil/preferências,
fora dos imports da aplicação isolada de testes MCP, têm respostas sintéticas.
Consentimento, login, projetos, conexão, versões, histórico, tokens e revogação
passam pelo servidor/PostgreSQL reais. O teste cobre cancelamento, login com
retomada, PKCE, redução, conflito, recarga, paginação/filtro, revogação recusando
o token, estado WhatsApp, foco/teclado e toque emulado a 390 px.

Os inspectors recebem a mesma sessão sintética e o cookie de correlação com seu
path restrito. O gate recusa medir a página de login ou um erro em lugar do
formulário de consentimento. Não foram alteradas regras de autenticação para
permitir a inspeção. Relatórios/capturas: `oriens-front/.taste-skill/p4/`.

Resultados finais: 161 testes frontend em 31 arquivos; TypeScript, ESLint dos
arquivos P4 e lint da skill aprovados. No host, 45 testes de MCP/OAuth/segurança
mais 41 regressões de domínio foram executados sem falhas. Java 17 executou 42
casos de MCP/OAuth/segurança mais as mesmas 41 regressões; os testes de clientes, ponte de navegador P0 e interface P4 foram executados
no host, fora da imagem Maven. A prova de UI financeira P3 e os casos opcionais
de navegador de estatísticas/projetos anteriores não foram repetidos por esta P4.
Build de produção: Configurações e consentimento com 0 FAIL nos três viewports;
consentimento com 0 WARN. Todas as capturas dos inspectors foram abertas.

Os resultados finais sanitizados estão em
[mcp-p4-evidence.json](2026-11-16-mcp-p4-evidence.json). A revisão visual e as
justificativas dos avisos estão em [mcp-p4-visual.md](2026-11-16-mcp-p4-visual.md).

## Limites da liberação

Esta entrega prova o ambiente isolado, incluindo habilitar/desabilitar/religar e
rollback transacional de migrações. Não certifica DNS, TLS, proxy, segredos,
backups ou CORS de um ambiente público ainda não publicado. A topologia da ponte
exige frontend/API HTTPS no mesmo site por causa do cookie SameSite Lax. O
[guia de uso e operação](../mcp.md) contém o smoke público e o procedimento de
recuperação; sua execução depende do ambiente de publicação.

Somente as versões indicadas dos dois clientes foram testadas. Outros clientes
precisam de registro/callback próprios e prova de compatibilidade. Dados das
capturas são exclusivamente sintéticos e não fazem parte da interface publicada.
