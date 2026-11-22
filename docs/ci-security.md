# Checks de segurança do CI

Os jobs de segurança vivem em `.github/workflows/checks.yml`, junto dos testes existentes. Rodam em
todo PR para `dev` ou `main`, inclusive documentação, forks e Dependabot. O deploy reutiliza esse
workflow e só inicia depois de todos os jobs passarem. Não há `pull_request_target`, herança de
segredos de produção ou merge automático.

## Política e nomes dos checks

| Job | Escopo | Reprova quando |
|---|---|---|
| `security-secrets` | Histórico Git alcançável por `HEAD`, com Gitleaks | Há candidato a segredo ou erro de execução |
| `security-dependencies-front` | Lockfile npm, dependências diretas/transitivas e desenvolvimento | Há severidade alta/crítica ou erro operacional |
| `security-dependencies-api` | Dependências Maven, incluindo testes | Há CVSS >= 7 ou erro operacional |
| `security-codeql (java-kotlin)` | Código Java da API | Há achado com `security-severity >= 7`, relatório inválido/ausente ou análise incompleta |
| `security-codeql (javascript-typescript)` | JavaScript/TypeScript do repositório | Mesma política do Java |

Médias e baixas ficam nos relatórios de dependências. Achados antigos, suprimidos ou fora das linhas
alteradas pelo PR também contam no verificador CodeQL; a análise por diferenças está desabilitada.
Um diagnóstico operacional de nível warning/error no SARIF exige triagem e reprova, mesmo quando a
invocação se declara bem-sucedida. Regras de segurança sem severidade também reprovam: não se presume
que um resultado desconhecido seja seguro.

Concluir uma análise ou fazer upload de SARIF não significa que o código passou na política. O
verificador `.github/security/codeql_gate.py` avalia os resultados completos depois da análise.
O workflow também exige sucesso do step de análise: `invocations` é opcional no formato SARIF,
então sua ausência no relatório não é usada para adivinhar se a execução terminou.

O status vermelho só **impede merge** quando exigido pela proteção de branches. Configurar essa
proteção em `dev` e `main` é a tarefa #56; use os nomes efetivamente exibidos pelo GitHub, incluindo
os prefixos da chamada reutilizada quando aplicáveis. Esta mudança não configura essa proteção.

## Execução local

Com Node 22/npm e Java 17/Maven Wrapper:

```sh
# Na raiz; sem rede ou dependências Python adicionais.
python3 -B -m unittest discover -s .github/security -p 'test_codeql_gate.py' -v

# Gitleaks 8.30.1 instalado e verificado; os fixtures usam repositórios temporários.
GITLEAKS_BINARY=/caminho/absoluto/gitleaks python3 -B -m unittest discover -s .github/security -p 'test_gitleaks.py' -v

# Valores sempre ocultos; não adicione --verbose nem publique relatório bruto.
gitleaks git . --log-opts=HEAD --redact=100 --ignore-gitleaks-allow --no-banner --no-color --exit-code=1

# Na pasta oriens-front; não instala pacotes nem executa scripts de lifecycle.
npm audit --include=dev --audit-level=high --json

# Na pasta oriens-api; o perfil não faz parte de test/package normais.
./mvnw -B -Psecurity-audit dependency-check:check

# Depois de uma análise CodeQL: diretório com um ou mais arquivos *.sarif.
python3 -B .github/security/codeql_gate.py /caminho/dos/relatorios
```

O código de saída do verificador CodeQL é 0 para análise válida abaixo do limiar, 1 para achados
bloqueantes e 2 para relatório inválido/ausente ou execução incompleta. As mensagens mostram só
contagens e diagnóstico fixo; não reproduzem mensagens/trechos do SARIF.

## Relatórios, cache e credenciais

- Os relatórios `npm-audit`, `dependency-check` (HTML/JSON) e `codeql-<linguagem>` ficam nos artefatos
  do workflow por sete dias, inclusive quando achados reprovam. Relatório obrigatório ausente é erro.
- Gitleaks só apresenta valores ocultos nos logs. Não gera artefato de segredos no CI.
- `.gitleaks.toml` estende as regras padrão com `spring-mail-password`, porque a regra genérica não
  cobre a senha SMTP literal em propriedades Spring. `${MAIL_PASSWORD}` continua permitido.
- A base NVD usa cache diário, separado pela versão do Dependency-Check. Uma análise concluída que
  reprova por achados ainda pode guardar a base; cache não dispensa atualização nem auditoria.
- A carga NVD usa os feeds oficiais JSON 2.0, sem chave, pelo suporte nativo do Dependency-Check.
  A primeira carga é maior; as seguintes usam os metadados de atualização e o cache. Há timeout de
  45 minutos; falha de atualização reprova. Confira os logs e a disponibilidade da NVD antes de
  reexecutar. Nenhuma chave NVD é exigida em PRs ou armazenada no repositório.
- O analisador opcional OSS Index fica desligado porque exige autenticação; a auditoria Java usa NVD.
- Dependency-Check fica no release 13.0.0. A API anônima foi descartada na validação: o 13.0.0
  tentou usar um default de chave vazia, e o 12.2.2 chegou a baixar dados mas recebeu HTTP 429.
  Os feeds oficiais preservam o release atual e o requisito de não precisar de chave nos PRs.
- CodeQL recebe `security-events: write` apenas no próprio job. O job chamador do deploy permite
  esse escopo por exigência de workflows reutilizáveis; os testes e o deploy conservam suas próprias
  permissões. `checkout` não persiste credenciais Git.

Não acrescente `continue-on-error`, baseline global ou exclusão de desenvolvimento/testes para
deixar o workflow verde. Um falso positivo precisa de triagem explícita, justificativa revisada e
exceção mínima em entrega própria. Credencial real exige rotação; remover o texto do arquivo atual
não remove a exposição anterior. Não reescreva o histórico sem autorização específica.

## Dependabot e ativação no GitHub

`.github/dependabot.yml` configura Maven, npm e GitHub Actions para segunda-feira, 09h de Recife,
com até cinco PRs abertos por ecossistema. Atualizações minor/patch podem ser agrupadas; majors
permanecem em PRs separados. Nada é mesclado automaticamente.

PRs de **versão** miram `dev`. PRs automáticos de **segurança** sempre miram a branch padrão, hoje
`main`; `target-branch: dev` não muda essa regra do GitHub. O YAML deve chegar à branch padrão para
ativar o agendamento normal. Dependabot acompanha as referências Maven/Actions; a versão e o
checksum do binário Gitleaks, instalados por URL no shell, precisam de manutenção explícita.

Antes do aceite remoto, conferir no GitHub:

1. Dependency graph, Dependabot alerts e security updates habilitados; YAML sozinho não ativa todos
   esses recursos. Maven pode exigir submissão do grafo resolvido para ampliar alertas nativos;
   o check NVD do CI independe disso.
2. CodeQL em advanced setup. Se default setup estiver ativo, ele conflita com o upload produzido
   pelo workflow versionado; ajustar a configuração de forma explícita antes de validar o CI.
3. Primeira execução real dos dois jobs CodeQL, upload SARIF e check do relatório completo.
4. Execução de PR do Dependabot/fork via `pull_request`, sem secrets de produção. O evento permite
   o upload CodeQL de PRs com token restrito conforme as regras do GitHub; não contornar usando PAT
   ou executando código do PR em `pull_request_target`.
5. Checks obrigatórios nas duas branches, quando a #56 for executada.

Esta entrega local não modifica configurações externas nem publica a branch.

## Dívida encontrada e aceite

O primeiro scan pode reprovar a base existente. Registrar achados e encaminhar correção própria;
não dispensar a política escolhida só porque o problema antecede o PR. A evidência datada da #65
fica em `docs/plans/2026-11-22-ci-security-checks-evidence.md` e distingue provas locais de itens
que ainda precisam executar no GitHub.

## Referências

- [npm audit](https://docs.npmjs.com/cli/commands/npm-audit/)
- [Dependency-Check: configuração](https://dependency-check.github.io/DependencyCheck/dependency-check-maven/configuration.html)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [CodeQL: resultados no PR](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/triage-alerts-in-pull-requests)
- [Dependabot e branch de destino](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customizing-dependabot-prs)
- [Dependabot no Actions](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions)
