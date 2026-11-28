# Política de merge em `dev` e `main`

Estado em 2026-11-26. A API do GitHub retornou `protected: false` e nenhuma
regra ativa para as duas branches. A ativação e a prova de bloqueio dependem
da autorização do dono no Oriens #56.

## Regras propostas

- Exigir PR para toda integração em `dev` e `main`, inclusive dependências,
  documentação e release. Aplicar a regra também a administradores e bloquear
  force-push e exclusão. Promover `dev` a `main` por PR de release.
- Exigir os nove checks abaixo com origem **GitHub Actions**. Antes do merge,
  conferir se o destino e o head coincidem com as revisões registradas e repetir
  as verificações afetadas se houver mudança. Use o [fluxo de revisão](pull-request-review.md).

| Check no PR (`Checks`) | Check no `Deploy` |
| --- | --- |
| `docs` | `checks / docs` |
| `test-api` | `checks / test-api` |
| `test-postgres` | `checks / test-postgres` |
| `test-front` | `checks / test-front` |
| `security-secrets` | `checks / security-secrets` |
| `security-dependencies-front` | `checks / security-dependencies-front` |
| `security-dependencies-api` | `checks / security-dependencies-api` |
| `security-codeql (java-kotlin)` | `checks / security-codeql (java-kotlin)` |
| `security-codeql (javascript-typescript)` | `checks / security-codeql (javascript-typescript)` |

Para proteger as branches, selecione a primeira coluna. Os nomes da segunda
coluna vêm da chamada reutilizada após o push para `main` ou disparo manual.
O job `deploy` espera a conclusão de `checks`. O check `CodeQL` da integração
de code scanning é exibido à parte dos dois jobs `security-codeql (…)` do
GitHub Actions. Consulte a [evidência dos runs](../plans/2026-11-22-ci-security-checks-evidence.md#execuções-no-github)
e o [guia de deploy](deploy.md).

O [workflow Checks](../../.github/workflows/checks.yml) roda em `pull_request`
para `dev`, `main` e `refac/**`, sem filtro de caminhos. Em um PR só de Markdown,
os nove jobs executam, incluindo o próprio `docs`. Evite filtros de caminhos e
instruções de skip na mensagem do commit, pois um workflow omitido pode deixar
um check obrigatório pendente. [Comportamento dos checks no GitHub](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)

## Regressão visual

Mantenha `test-visual` informativo por enquanto. Ele roda em workflow separado,
também sem filtro de caminhos nos PRs. No [PR de bot #56](https://github.com/Guga2111/Oriens/actions/runs/45732701592),
o arraste do quadro em `desktop-dark` falhou. No [PR #62](https://github.com/Guga2111/Oriens/actions/runs/45879672073),
o job passou em outro head. Essa amostra ainda exige triagem da falha e
execuções repetidas no mesmo SHA e em PRs representativos (inclusive só Markdown)
antes de propor o check como obrigatório. Use o [guia visual](visual-regression.md).

## Ativação e aceite pelo dono

1. Consultar as regras efetivas de ambas as branches e salvar a configuração
   anterior para rollback. Conferir nomes, origem e resultados em runs recentes
   de PR para os dois destinos. No GitHub, o check precisa ter passado no
   repositório nos últimos sete dias para poder ser exigido.
2. Criar em **Settings → Rules → Rulesets** uma regra de branches para os nomes
   exatos `dev` e `main`. Exigir PR e os nove checks da primeira coluna,
   escolhendo GitHub Actions como origem. Bloquear force-push e exclusão e
   deixar a lista de bypass vazia. Ativar a regra e conferir seu efeito nos
   dois destinos. [Regras do GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
3. Abrir um PR de teste por destino a partir da respectiva branch, somente com
   um ajuste Markdown inofensivo. Deixá-los prontos para revisão e registrar
   o head, o SHA do commit de merge de teste quando exibido e os nove resultados
   bem-sucedidos. Conferir no quadro de merge que a exigência de checks foi satisfeita.
4. Em cada PR de teste, introduzir temporariamente um link Markdown relativo
   para arquivo inexistente. Confirmar que `docs` termina em `failure` no novo
   SHA e que o quadro informa bloqueio por esse check obrigatório, usando um
   ator sem bypass. Registrar links aos runs e a mensagem de bloqueio.
5. Remover o link inválido com novo commit, confirmar `docs` verde e a liberação
   da exigência de checks. Fechar os PRs de teste sem mesclar. Guardar o registro
   de aceite por destino com os SHAs, runs e evidência do quadro de merge.

## Manutenção e rollback da regra

Ao renomear, adicionar ou retirar um check, compare esta tabela com o GitHub
e coordene a troca com o dono. Para uma substituição, publique e confirme o
novo contexto enquanto o anterior ainda reporta, atualize as exigências e
só então retire o contexto antigo. Repita o aceite nas duas branches.

Se um check obrigatório parar de reportar, confirme o nome, origem, evento
e SHA antes de ajustar a regra. Qualquer exceção ou restauração da configuração
anterior precisa de autorização explícita do dono, registro do motivo, duração
e confirmação da restauração da proteção. O aceite usa apenas PRs de teste e
os respectivos checks. O [rollback de produção](deploy.md#falha-e-rollback)
segue o guia de deploy.
