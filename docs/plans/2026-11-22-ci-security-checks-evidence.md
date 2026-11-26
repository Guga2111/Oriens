# Segurança no CI — evidência da #65

Data: 2026-11-22 · Branch: `ci/security-checks` · Base: `dev` em `3726a53`

Consulta ao GitHub atualizada em 2026-11-26. Os resultados locais abaixo
registram o estado do checkout de 22/11.

## Entrega

- Desenho aprovado registrado inicialmente no commit `9fba633`.
- Jobs de Gitleaks, npm audit, Dependency-Check e CodeQL adicionados ao workflow reutilizado pelo
  deploy; configuração semanal do Dependabot para Maven/npm/Actions.
- Limiar aprovado preservado: altas/críticas ou CVSS >= 7 reprovam, inclusive achados antigos.
- Nenhuma atualização de dependência da aplicação, rotação externa, implantação, proteção de branch,
  baseline de achados ou supressão automática foi realizada.
- A alteração local preexistente de `.mcp.json` foi preservada e excluída dos commits da entrega.

## Provas locais concluídas

| Prova | Resultado |
|---|---|
| `GITLEAKS_BINARY=… python3 -B -m unittest discover -s .github/security -p 'test_*.py' -v` | **20 testes passando**: 16 do verificador CodeQL e 4 de integração com Gitleaks |
| `actionlint -shellcheck= .github/workflows/checks.yml .github/workflows/deploy.yml` (1.7.12) | Sem diagnósticos; ShellCheck não estava instalado |
| `bash -n` em todos os steps `run` dos dois workflows | 22 comandos sintaticamente válidos |
| Leitura YAML dos workflows/Dependabot e TOML do Gitleaks | Formatos válidos; gatilhos, permissões, SHAs, integração do deploy e configuração conferidos |
| Modelo efetivo Maven e inspeção XML | Perfil de segurança isolado; limiar 7, testes incluídos, `failOnError=true`, sem chave NVD |
| `./mvnw -B -Dmaven.test.skip=true package`, com Java 17 | **BUILD SUCCESS**, 11,767 s; valida a compilação manual usada pelo CodeQL e preserva o build normal sem auditoria |
| Step final CodeQL extraído do workflow, executado com SARIF limpo e outcomes simulados | `success` passa; `failure`, `skipped` e `cancelled` reprovam, mesmo com relatório existente |
| `git diff --check` | Sem erros |
| Gitleaks com `git --staged`, sobre os arquivos desta implementação | **Exit 0**: nenhum segredo novo detectado nos arquivos preparados para commit |

O JDK 17 Temurin e os binários Gitleaks/actionlint foram obtidos de releases oficiais, com checksum
verificado, em diretório temporário; não houve instalação permanente ou dependência Python nova.
O job de CI conserva Node 22; a auditoria npm local usou a instalação já disponível da máquina.

### Política CodeQL

Testes demonstram o limiar exato 7, resultados baixos/médios, achados antigos e suprimidos, múltiplos
arquivos/runs, referências de regras, diagnóstico operacional, dados inválidos e ausência de relatório.
Também verificam que mensagens do SARIF não são reproduzidas nos logs.

A documentação oficial informa o nome `CodeQL command-line toolchain` e que campos opcionais do
SARIF devem ser tratados como opcionais. O verificador aceita esse nome e `CodeQL`; a conclusão da
análise é provada pelo outcome do step, além da inspeção de diagnósticos presentes no relatório.
Isso foi conferido em testes, não equivale a uma execução completa do CodeQL no GitHub.

### Segredos

Os testes criam históricos Git descartáveis, fora do repositório Oriens. Um token sintético removido
em commit posterior ainda reprova e tem valor oculto. A regra SMTP detecta senha literal e permite
placeholder `${MAIL_PASSWORD}`. Configuração inválida não passa.

A varredura real do histórico alcançável por `HEAD`, com as regras finais, retornou **exit 1** e
**17 candidatos**: 16 pela regra padrão `generic-api-key` e 1 por `spring-mail-password`.
Todos os campos `Secret` do relatório local estavam redigidos como `REDACTED`. Nenhum valor foi
copiado para esta evidência ou commitado.

Os 16 candidatos genéricos estão em documentação, fixture de teste e artefato de build já versionado;
precisam de triagem explícita, não são 16 credenciais confirmadas. A senha SMTP literal já consta
como dívida em `docs/conventions/backend.md` §11. Não foi acessado o serviço SMTP nem verificada a
validade dessa credencial. A rotação e qualquer tratamento do histórico exigem entrega específica.

### Dependências npm

Comando real, sem instalar pacotes ou executar scripts:

```sh
npm audit --include=dev --audit-level=high --json
```

Retornou **exit 1**, sem erro operacional. Resumo do npm: **19 altas, 2 críticas e 8 moderadas**,
29 no total. São as contagens do npm, não necessariamente CVEs distintos. O lockfile permaneceu
inalterado; não foi executado `npm audit fix`.

### Dependências Maven e fonte NVD

Com Java 17, Maven Wrapper e cache/configuração local isolados, o comando final foi:

```sh
./mvnw -B -Psecurity-audit dependency-check:check
```

O Dependency-Check **13.0.0 concluiu a análise de 114 artefatos em 1 min 15 s**, produziu
`apps/api/target/dependency-check-report.html` e `.json`, e retornou **exit 1 por achados com
CVSS >= 7**. O log identifica 11 artefatos bloqueantes, incluindo dependência de teste (`assertj-core`),
Jackson, driver PostgreSQL, componentes Spring e Tomcat. Isso prova inclusão de testes e reprovação
real de dependências existentes; não constitui confirmação manual de cada associação CPE/CVE.

O scanner compara as pontuações CVSS disponíveis. Uma mesma CVE pode ter, por exemplo, CVSS 3 alto
e CVSS 4 médio; o rótulo agregado `severity` do JSON não substitui o critério numérico do plugin.
Não somar ocorrências repetidas em vários artefatos como se fossem vulnerabilidades distintas.

**Ajuste comprovado durante a implementação:** a API anônima do 13.0.0 abortou por default de chave
vazia; a do 12.2.2 baixou parte dos dados e falhou com HTTP 429. O suporte nativo aos **feeds oficiais
NVD JSON 2.0** resolveu ambos os problemas sem chave, serviço pago, mirror próprio ou downgrade.
O perfil e a chave de cache finais usam o release 13.0.0 e o feed oficial.

Não foram suprimidos achados nem atualizadas versões da aplicação para obter verde nesta tarefa.

## Execuções no GitHub

Em 2026-11-26, os quatro runs abaixo concluíram com sucesso na primeira
tentativa. Em cada run passaram Gitleaks, npm audit, Dependency-Check e os
dois jobs CodeQL, incluindo os steps de análise/publicação e verificação do
SARIF. Os SHAs da tabela são os heads reportados pelo Actions.

| Run | Evento e destino | Head | Resultado |
| --- | --- | --- | --- |
| [45879671927](https://github.com/Guga2111/Oriens/actions/runs/45879671927) | `pull_request`, PR #62 → `dev` | `cfd6ed5` | 9 jobs do `Checks` passaram |
| [45732701673](https://github.com/Guga2111/Oriens/actions/runs/45732701673) | `pull_request`, PR #56 do Dependabot → `dev` | `364eb75` | 9 jobs do `Checks` passaram |
| [45728821162](https://github.com/Guga2111/Oriens/actions/runs/45728821162) | `pull_request`, release PR #51 → `main` | `5a75a40` | 9 jobs do `Checks` passaram |
| [45732085997](https://github.com/Guga2111/Oriens/actions/runs/45732085997) | `push` em `main`, workflow `Deploy` | `59b4ede` | 9 jobs `checks / …` passaram, seguidos do job `deploy` |

A API de artefatos listou `npm-audit`, `dependency-check`,
`codeql-java-kotlin` e `codeql-javascript-typescript` nos quatro runs.
A evidência registra nomes e resultados sanitizados. A política e os
[nomes dos checks de PR e do deploy](../guides/merge-policy.md) ficam no guia de merge.

O PR #56 do GitHub veio do Dependabot no mesmo repositório. Ele comprova o
caso do bot. A lista de PRs não mostrou exemplo de fork externo para confirmar
esse caso. O run do deploy comprova a chamada reutilizada no fluxo de sucesso.
A evidência não cobre rejeição de merge por regra ativa, falha no deploy ou
todos os caminhos de cache da NVD.

## Dependabot, cadeia de dependências e ações do dono

| Item | Leitura em 2026-11-26 | Ação pendente |
| --- | --- | --- |
| Atualizações de versão | [`dependabot.yml` em `main`](https://github.com/Guga2111/Oriens/blob/main/.github/dependabot.yml), com Maven (`/apps/api`), npm (`/apps/client`) e Actions (`/`) mirando `dev`. Os PRs de versão [#52](https://github.com/Guga2111/Oriens/pull/52) a [#56](https://github.com/Guga2111/Oriens/pull/56) confirmam atualizações de npm após o monorepo. | Conferir histórico dos jobs de versão dos demais ecossistemas quando disponível. |
| Grafo de dependências | A [página do grafo](https://github.com/Guga2111/Oriens/network/dependencies) exibia `Dependency graph is disabled` e `dependency-graph/sbom` retornou HTTP 404. A composição do grafo não estava disponível. | Habilitar o grafo e validar a cobertura dos manifests/lockfile. Para transitivas Maven, conferir a submissão do grafo resolvido e habilitar a submissão automática se faltar cobertura. |
| Dependabot alerts | `vulnerability-alerts` retornou HTTP 404 com `Vulnerability alerts are disabled`. | Habilitar alertas após o grafo e triar os resultados. |
| Dependabot security updates | `automated-security-fixes` retornou `enabled: false`. | Habilitar atualizações de segurança e validar PR para a branch padrão `main` quando houver alerta elegível com correção. |
| CodeQL | `code-scanning/default-setup` retornou `not-configured`. O setup versionado executou nos quatro runs, com análises de ambas as linguagens visíveis no GitHub. | Manter o setup versionado e acompanhar os resultados. |

Qualquer ajuste de configuração do GitHub depende de autorização do dono.
O Dependency-Check do CI tem cobertura própria, independente do grafo do
GitHub. Veja [ecossistemas do grafo](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems)
e [operação dos checks](../ci-security.md).

## Referências

- [Desenho aprovado](2026-11-22-ci-security-checks-design.md)
- [Operação dos checks](../ci-security.md)
- [Formato SARIF do CodeQL](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-cli/sarif-output)
- [CodeQL em PRs do Dependabot](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/resource-not-accessible)
- [Feed oficial NVD](https://nvd.nist.gov/vuln/data-feeds)
