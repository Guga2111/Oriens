# Segurança no CI — evidência local da #65

Data: 2026-11-22 · Branch: `ci/security-checks` · Base: `dev` em `3726a53`

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
`oriens-api/target/dependency-check-report.html` e `.json`, e retornou **exit 1 por achados com
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

## Limites e pendências de aceite remoto

- Ainda não houve push/PR nem execução dos workflows no GitHub. Os dois CodeQL completos, o upload
  SARIF, os artefatos remotos e a restauração/gravação do cache precisam dessa primeira execução.
- Compatibilidade de forks/Dependabot foi projetada conforme a documentação do evento `pull_request`
  e conferida no código; ainda precisa de execução real desses tipos de PR.
- Dependabot requer que o YAML chegue à branch padrão; conferir dependency graph, alerts e security
  updates nas configurações do GitHub. Atualizações de versão miram `dev`; as de segurança miram `main`.
- Se default setup do CodeQL estiver ativo, resolver explicitamente o conflito com advanced setup.
- Os achados existentes mantêm os scans de segredos/dependências vermelhos até correção/triagem.
- A proteção obrigatória de `dev`/`main` continua na tarefa #56. O encadeamento `deploy.needs: checks`
  foi conferido estaticamente; não foi provocado um deploy de produção para testar reprovação.
- As suítes de domínio H2/PostgreSQL/frontend e E2E não foram reexecutadas: não houve mudança de
  regra de negócio, UI, schema ou runtime da aplicação. As provas foram direcionadas ao CI e ao build.

## Referências

- [Desenho aprovado](2026-11-22-ci-security-checks-design.md)
- [Operação dos checks](../ci-security.md)
- [Formato SARIF do CodeQL](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-cli/sarif-output)
- [CodeQL em PRs do Dependabot](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/resource-not-accessible)
- [Feed oficial NVD](https://nvd.nist.gov/vuln/data-feeds)
