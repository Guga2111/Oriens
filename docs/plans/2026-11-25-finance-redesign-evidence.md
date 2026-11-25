# Financeiro — evidência da tarefa #121

Validação do [redesenho e da carteira manual](2026-11-25-finance-redesign-draft.md) sobre a integração `refac/financial-features-2` em `c71f93580dca7770dfe0487e73f210d5366668f3`. O navegador usou o cliente local em `http://localhost:5173`, a API desta revisão e um PostgreSQL 15 descartável. Cada cenário novo registrou uma conta sintética própria.

## Resultados observados

| Fluxo | Verificação |
| --- | --- |
| Rendimento recebido | R$ 100,00 produziram uma única linha positiva com a tag Investimentos. Receitas, resultado do mês e saldo disponível passaram de R$ 0,00 para R$ 100,00. A posição permaneceu em R$ 1.000,00. |
| Aporte e resgate | O aporte de R$ 200,00 elevou a primeira posição de R$ 500,00 para R$ 700,00. O resgate de R$ 50,00 reduziu a segunda de R$ 800,00 para R$ 750,00. O histórico mostrou uma transferência por movimento, com a tag Investimentos e os respectivos sinais − e +. O saldo disponível passou de R$ 750,00 para R$ 550,00 e depois para R$ 600,00. Receitas, despesas e resultado permaneceram em R$ 1.000,00, R$ 250,00 e R$ 750,00. |
| Primeira posição e avaliação | O cadastro inicial de R$ 1.000,00 preservou o histórico vazio. A nova avaliação de R$ 1.250,00 apareceu ao lado da inicial e atualizou a posição sem alterar o caixa. |
| Histórico e recorrências | A visão mensal abriu os lançamentos com período e categoria já aplicados. A busca combinou com os filtros e persistiu após editar. Um lançamento manual com a tag Investimentos permaneceu como despesa comum. Uma receita mensal criada pelo formulário apareceu no histórico e teve o valor corrigido pela gestão de recorrências. |
| Carregamento, erro e vazio | O Playwright reteve a consulta ao resumo da carteira para verificar o carregamento, respondeu com HTTP 503 e usou `Enter` em **Recarregar dados**. A nova tentativa consultou a API real e exibiu a carteira vazia. |
| Teclado e largura | `Enter` abriu o formulário da primeira aplicação, `Tab` passou de Nome da aplicação para Classe e `Escape` fechou o formulário. A largura do documento, do conteúdo e dos diálogos foi verificada nos fluxos cobertos. |

A [suíte do Financeiro](../../apps/client/e2e/financial-portfolio.spec.ts) usa a API real para todas as gravações. O cenário de falha simula somente a consulta indicada.

## Capturas de `/financial/investments`

| Viewport | Claro | Escuro |
| --- | --- | --- |
| Desktop 1440 × 900 | [Carteira com a primeira aplicação](../screenshots/finance-121/desktop-light.png) | [Carteira com a primeira aplicação](../screenshots/finance-121/desktop-dark.png) |
| Celular 390 × 844 | [Carteira com a primeira aplicação](../screenshots/finance-121/mobile-light.png) | [Carteira com a primeira aplicação](../screenshots/finance-121/mobile-dark.png) |

## Reprodução

A partir de `apps/client`, com a API de teste acessível nas URLs de `E2E_API_BASE_URL` e `VITE_API_BASE_URL`:

```sh
npm run test:e2e -- e2e/financial-portfolio.spec.ts e2e/financial.spec.ts --workers=2 --reporter=list,html
npm run lint
npm test -- --maxWorkers=2
npm run build
```

Na raiz, com Java 25 e Docker:

```sh
scripts/postgres-tests.sh InvestmentMigrationPostgresTest InvestmentPostgresTest StatisticsPostgresTest
MANAGEMENT_SERVER_PORT=0 scripts/postgres-tests.sh McpP3PostgresTest
python3 -B scripts/check-docs-links.py
python3 -B -m unittest discover -s scripts/tests -p 'test_check_docs_links.py' -v
```

O [guia de regressão visual](../guides/visual-regression.md) descreve a comparação das baselines existentes no Chromium Linux. As capturas de carteira acima registram os cenários funcionais.

## Resultados dos comandos

- **Playwright funcional:** 13 cenários aprovados em desktop e celular. Três variantes já eram ignoradas no spec anterior. A troca de mês com categoria tem fixture exclusiva de desktop e a criação de tag (BE6) permanece marcada como `fixme` nos dois viewports.
- **Playwright visual:** 8 comparações aprovadas na imagem Linux amd64 fixada pelo guia, cobrindo landing e editor de tarefas com as baselines versionadas.
- **PostgreSQL:** 60 testes aprovados e quatro provas opcionais omitidas pelo ambiente. A migração V13→V15 manteve os lançamentos antigos como `STANDARD` e garantiu uma tag de sistema por conta. A suíte da carteira provou respostas 404 para recursos de outra conta. O agendador financeiro preservou a geração e a deduplicação de ocorrências.
- **Cliente:** 409 testes aprovados com dois workers, incluindo os 52 testes financeiros. A primeira tentativa em paralelo com as suítes de navegador excedeu o tempo limite em 17 casos. Lint sem erros, com 14 avisos preexistentes, e build aprovado.
- **Documentação:** checagem de links e sete testes do validador aprovados.
