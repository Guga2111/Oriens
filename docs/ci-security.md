# Checks de segurança do CI

Os jobs de segurança vivem em `.github/workflows/checks.yml`, junto dos testes existentes. Rodam em
todo PR para `dev`, `main` ou branches de integração `refac/**`, inclusive documentação, forks e Dependabot. O deploy reutiliza esse
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

Supressões do próprio SARIF nunca são aceitas. Falso positivo revisado vai em
`.github/security/codeql-triage.json`: regra, arquivo, fingerprint da linha (`primaryLocationLineHash`),
justificativa e data `until`. A entrada só vale enquanto a linha não mudar e até vencer; depois o achado
volta a reprovar e precisa de nova revisão. Achado real se corrige no código, não entra na triagem.
O verificador lê as regras tanto em `tool.driver` quanto no pacote de consultas em `tool.extensions`
(formato do CodeQL CLI); referência de componente inválida reprova.

Concluir uma análise ou fazer upload de SARIF não significa que o código passou na política. O
verificador `.github/security/codeql_gate.py` avalia os resultados completos depois da análise.
O workflow também exige sucesso do step de análise: `invocations` é opcional no formato SARIF,
então sua ausência no relatório não é usada para adivinhar se a execução terminou.

O status vermelho só **impede merge** quando exigido pela proteção de branches. Configurar essa
proteção em `dev` e `main` depende do dono na tarefa #56. A [política de merge](guides/merge-policy.md)
registra os nomes reportados em PR, os contextos da chamada reutilizada e o roteiro de aceite.

## Execução local

Com Node 22/npm e Java 25/Maven Wrapper:

```sh
# Na raiz; sem rede ou dependências Python adicionais.
python3 -B -m unittest discover -s .github/security -p 'test_codeql_gate.py' -v

# Gitleaks 8.30.1 instalado e verificado; os fixtures usam repositórios temporários.
GITLEAKS_BINARY=/caminho/absoluto/gitleaks python3 -B -m unittest discover -s .github/security -p 'test_gitleaks.py' -v

# Valores sempre ocultos; não adicione --verbose nem publique relatório bruto.
gitleaks git . --log-opts=HEAD --redact=100 --ignore-gitleaks-allow --no-banner --no-color --exit-code=1

# Na pasta apps/client; não instala pacotes nem executa scripts de lifecycle.
npm audit --include=dev --audit-level=high --json

# Na pasta apps/api; o perfil não faz parte de test/package normais.
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
  cobre a senha SMTP literal em propriedades Spring. Placeholder como `${MAIL_PASSWORD}` continua
  permitido. O SMTP foi removido da API em 2026-11-23; a regra fica para barrar a reintrodução.
- `.gitleaksignore` lista, por fingerprint, achados do histórico já triados: falsos positivos e a senha
  SMTP antiga, rotacionada em 2026-11-22 e removida do HEAD junto com o envio por SMTP.
  Achado novo não entra nessa lista: remova o valor e rotacione o segredo primeiro. O histórico não é
  reescrito.
- A base NVD usa cache diário, separado pela versão do Dependency-Check. Uma análise concluída que
  reprova por achados ainda pode guardar a base; cache não dispensa atualização nem auditoria.
- A carga NVD usa os feeds oficiais JSON 2.0, sem chave, pelo suporte nativo do Dependency-Check.
  A primeira carga é maior; as seguintes usam os metadados de atualização e o cache. Há timeout de
  45 minutos; falha de atualização reprova. Confira os logs e a disponibilidade da NVD antes de
  reexecutar. Nenhuma chave NVD é exigida em PRs ou armazenada no repositório.
- Falsos positivos do Dependency-Check vão em `apps/api/dependency-check-suppressions.xml`, um por
  CVE e pacote (`packageUrl` + `cve`, nunca só CPE), com justificativa e data `until` para revisão.
  Supressão vencida volta a reprovar. Não suprima achado real para destravar o gate.
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
`main`. Com `target-branch: dev`, as opções dos três blocos se aplicam aos PRs de versão. O YAML já
está na branch padrão. Dependabot acompanha as referências Maven/Actions; a versão e o
checksum do binário Gitleaks, instalados por URL no shell, precisam de manutenção explícita.

Em 2026-11-26, o grafo, os alertas e as atualizações de segurança estavam
desabilitados. Os PRs de versão de npm já estavam sendo abertos para `dev`.
O CodeQL versionado executou nos PRs e no deploy, e o default setup estava
sem configuração. Em PRs de bot e de fork, mantenha `pull_request` e o token
restrito do workflow para upload CodeQL.

## Dívida encontrada e aceite

Se o scan reprovar a base existente, registre e encaminhe o achado para
correção própria. A [evidência da #65](plans/2026-11-22-ci-security-checks-evidence.md)
registra os checks no GitHub, os limites da amostra e as ações que dependem
do dono do repositório.

## Referências

- [npm audit](https://docs.npmjs.com/cli/commands/npm-audit/)
- [Dependency-Check: configuração](https://dependency-check.github.io/DependencyCheck/dependency-check-maven/configuration.html)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [CodeQL: resultados no PR](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/triage-alerts-in-pull-requests)
- [Dependabot e branch de destino](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customizing-dependabot-prs)
- [Dependabot no Actions](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions)
