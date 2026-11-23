# Segurança no CI — desenho e plano de entrega

Data: 2026-11-22 · Branch: `ci/security-checks` · Objetivo Oriens 12 · Tarefa #65

## Aprovação e problema

Desenho aprovado em duas etapas na conversa de 2026-11-22. O usuário também autorizou implementar
depois de registrar este plano. A política escolhida reprova vulnerabilidades altas e críticas,
inclusive preexistentes; médias e baixas permanecem nos relatórios. Segredos detectados reprovam.

O `checks.yml` atual executa testes da API (H2 e PostgreSQL), lint, testes e build do frontend.
O deploy de `main` chama esse mesmo workflow antes de publicar. Faltam varredura de segredos,
auditoria de dependências, análise estática de segurança e configuração versionada do Dependabot.

## Contexto e invariantes

- API: Java 17, Maven Wrapper e Spring Boot 3.5.6; frontend: Node 22, npm e `package-lock.json`.
- Preservar os testes existentes e a reutilização de `checks.yml` por `deploy.yml`.
- Executar os checks em todo PR para `dev`/`main`, sem filtros de caminho ou exceção para bots.
- Nunca fornecer credenciais de produção aos scanners ou executar código de PR por `pull_request_target`.
- Falha operacional, relatório obrigatório ausente/inválido ou análise incompleta não podem ficar verdes.
- Não criar baseline que dispense achados antigos, supressões automáticas, `continue-on-error` ou
  atualização automática/forçada de dependências para contornar os checks.
- A proteção obrigatória de branches é a tarefa #56 e permanece fora desta mudança.
- A alteração local preexistente de `.mcp.json` não pertence à entrega.

## Alternativas consideradas

| Alternativa | Benefício | Custo e decisão |
|---|---|---|
| Gitleaks + npm audit + OWASP Dependency-Check + CodeQL + Dependabot | Auditoria adequada a cada ecossistema; grafo Java resolvido pelo Maven; histórico Git para segredos | Mais ferramentas e cache NVD; **aprovada** |
| Gitleaks + Trivy para Java/npm + CodeQL + Dependabot | Unifica a auditoria de dependências | A leitura de `pom.xml` tem limitações de escopos e opcionais; descartada para esta entrega |

A comparação seguiu o padrão 7A da brainstorming-skill: avaliar cada alternativa dentro das
restrições reais do CI, com benefícios e custos explícitos.

## 1. Segredos

Adicionar job `security-secrets` com Gitleaks em versão fixa, histórico completo alcançável pelo
checkout e `--redact=100`. Reprovar achados e erros operacionais. Não publicar relatórios contendo
valores de segredos nem habilitar logs verbosos. Não ler arquivos locais não versionados.

O guia `docs/conventions/backend.md` §11 já registra credencial SMTP no histórico. Isso é dívida
conhecida, não autorização para suprimir o achado: a primeira execução deve registrar a existência
do problema sem revelar o valor. Rotação e eventual tratamento do histórico exigem entrega própria;
esta tarefa não reescreve Git nem altera credenciais externas.

## 2. Dependências

- `security-dependencies-front`: `npm audit --audit-level=high`, incluindo desenvolvimento e
  dependências transitivas do lockfile. Não executar `npm audit fix`, scripts de instalação ou build
  para auditar. Preservar relatório completo como artefato, mesmo em falha, quando disponível.
- `security-dependencies-api`: OWASP Dependency-Check em versão fixa, isolado em perfil Maven
  `security-audit`, fora da execução normal de testes. Configurar `failBuildOnCVSS=7`, incluir escopo
  de teste, gerar relatórios HTML/JSON e reprovar erro de execução.
- Cache da base NVD não é evidência de sucesso: a atualização e a análise precisam completar.
  Usar os feeds públicos oficiais NVD JSON 2.0, pelo suporte nativo do Dependency-Check, sem exigir
  chave em PRs; indisponibilidade reprova e tem mensagem acionável. Refinamento durante a prova:
  a API anônima do release 13.0.0 falhou por chave vazia e a do 12.2.2 recebeu HTTP 429. O feed
  conserva a mesma fonte NVD, evita credenciais em forks/bots e permite manter o release 13.0.0.
- Não exigir credenciais de serviços auxiliares pagos. Desabilitar analisador opcional que exija
  autenticação quando a cobertura aprovada já estiver atendida pela NVD.

## 3. Código: CodeQL

Adicionar job em matriz para Java e JavaScript/TypeScript, versão de Action fixa e suíte de segurança.
Compilar a API com Java 17 quando necessário; não subir banco nem executar testes nessa análise.
Publicar SARIF no code scanning do GitHub, com permissão de escrita apenas no job de CodeQL.

Além do upload, um verificador pequeno, de biblioteca padrão, avalia o SARIF completo gerado na
execução. Reprovar resultados de regras com `security-severity >= 7`, inclusive resultados antigos
ou suprimidos; não depender somente das anotações de novas linhas do PR. Não confundir o sucesso
do upload/análise com ausência de vulnerabilidades.

O verificador valida o formato esperado, a presença de uma análise e diagnósticos de execução.
O workflow exige também sucesso do step de análise, pois `invocations` é opcional no SARIF.
Relatório ausente, malformado ou execução explicitamente malsucedida reprovam. Mensagens mostram
contagens/IDs de regras, sem reproduzir trechos de código ou conteúdo controlado pelo PR.

## 4. Dependabot

Criar `.github/dependabot.yml` para Maven (`/oriens-api`), npm (`/oriens-front`) e GitHub Actions
(`/`), com frequência semanal, PRs de versão para `dev`, quantidade limitada de PRs abertos e majors
separadas. Sem merge automático ou concessão de permissão de escrita aos PRs do bot.

Limitação do produto confirmada na documentação: PRs automáticos de **segurança** sempre miram a
branch padrão (`main`), independentemente de `target-branch: dev`. A configuração deve preservar
essa distinção; alertas/atualizações de segurança dependem de habilitação nas configurações do
GitHub e não são ativados apenas pelo YAML. O arquivo precisa chegar a `main` para ativação normal.

## 5. Integração, permissões e manutenção

- Centralizar os jobs em `checks.yml`, mantendo nomes estáveis para a futura proteção da #56.
- Ajustar a chamada de `checks.yml` no deploy para permitir o escopo exigido pelo CodeQL; os demais
  jobs continuam com `contents: read`. Não herdar segredos do deploy.
- Fixar Actions tocadas por SHA e ferramentas por versão verificável. Dependabot acompanha Actions.
- Timeouts explícitos limitam problemas de rede. Cache nunca substitui a execução do scanner.
- PRs de forks/Dependabot usam `pull_request`, sem exigir segredos. Verificar a compatibilidade do
  upload de SARIF com esse evento e manter o verificador local como decisão por severidade.
- Se o CodeQL default setup estiver ativo no GitHub, documentar o conflito com advanced setup;
  não alterar configuração externa silenciosamente.

## 6. Sequência de implementação

1. Commitar este desenho aprovado, sem incluir `.mcp.json`.
2. Implementar e testar o verificador SARIF: limiar, relatórios inválidos, referências de regras,
   achados antigos/suprimidos e falhas operacionais.
3. Configurar os jobs de Gitleaks, npm audit, Dependency-Check e CodeQL e integrar permissões do deploy.
4. Configurar Dependabot e documentar execução local, relatórios e pré-requisitos externos.
5. Validar YAML/Actions, perfil Maven e comportamento dos scanners com entradas sintéticas
   descartáveis, sem commitar um segredo ou dependência vulnerável de propósito.
6. Executar os checks viáveis neste ambiente, registrar resultados e limitações em evidência datada.
   Não afirmar execução no GitHub ou proteção de merge sem comprovação.

## 7. Critérios de aceite e provas

| Cenário | Resultado esperado |
|---|---|
| Dependência alta/crítica, direta ou transitiva, inclusive antiga | Job reprovado, relatório disponível |
| Apenas dependências médias/baixas | Relatório disponível, limiar não reprova |
| Segredo sintético em commit anterior, removido do arquivo atual | Gitleaks reprova, valor oculto |
| SARIF com achado alto/crítico antigo ou suprimido | Verificador reprova |
| SARIF com achado abaixo de 7 ou sem achados | Verificador aprova análise válida |
| Scanner falha, relatório ausente/inválido ou análise incompleta | Job reprovado |
| PR para dev/main, inclusive docs, bot ou fork | Checks executam sem segredos de produção |
| Um job de segurança reprova no workflow reutilizado | Deploy não inicia |

Mudança na aplicação, banco ou UI não é necessária. Não ampliar a tarefa para migrações de versões
major ou correções de domínio: registrar a dívida que impedir o verde e encaminhar correção própria.
O aceite completo no GitHub exige a primeira execução real; tornar o merge obrigatório é #56.

## Rollback

Reverter somente o commit de implementação dos checks/configurações, preservando o desenho e as
evidências. Não há alteração de schema, dados, contrato de API/MCP nem implantação nesta entrega.

## Referências

- [npm audit](https://docs.npmjs.com/cli/commands/npm-audit/)
- [Dependency-Check: configuração](https://dependency-check.github.io/DependencyCheck/dependency-check-maven/configuration.html)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [CodeQL: resultados no PR](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/triage-alerts-in-pull-requests)
- [CodeQL Action: analyze](https://github.com/github/codeql-action/blob/main/analyze/action.yml)
- [Dependabot: branch de destino](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customizing-dependabot-prs)
- [Dependabot no Actions](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions)
- [Trivy: cobertura Java](https://trivy.dev/docs/latest/coverage/language/java/)

### Padrão de brainstorming aplicado (7A)

Fonte: `brainstorming-skill/references/pattern-categories-and-documentation.md`,
“Build-Within-Constraint Formula”. Template original utilizado na comparação:

```text
Generate [number] ideas to [solve challenge] with these hard constraints:
- Constraint 1: [specific limitation that cannot be violated]
- Constraint 2: [specific limitation that cannot be violated]
- Constraint 3: [specific limitation that cannot be violated]

These constraints are MANDATORY, not negotiable.

For each idea generated, explicitly show: How does this work WITHIN these constraints?

Format: Idea | How It Works Within Constraints | What It Enables | Trade-offs
```
