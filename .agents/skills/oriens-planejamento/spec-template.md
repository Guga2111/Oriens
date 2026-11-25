# Template de spec do Oriens

Copie para `docs/plans/AAAA-MM-DD-<slug>-design.md`. Substitua os marcadores `<...>`
e remova as instruções em itálico. Todas as seções são obrigatórias. Quando uma não
se aplicar, mantenha o título e explique o motivo em uma frase. Ao copiar,
transforme os caminhos citados abaixo em links relativos a `docs/plans/`.

---

# <Título da entrega>

Spec de <DD/MM/AAAA> para o objetivo #<id> do projeto <projeto>, “<título do objetivo>”.
Estado: <rascunho | aprovada em DD/MM/AAAA>. <O que a aprovação encerra, por exemplo a tarefa #N.>

## O que já funciona

_Descreva o comportamento atual com links para o código que será alterado. Separe o que
será reaproveitado do que muda._

## Escopo

_Liste o que a entrega inclui e, em seguida, o que fica fora e por quê._

## Alternativas e decisão

_Compare as abordagens que mudam materialmente o resultado e registre a escolhida com o
motivo._

## Regras e exemplos

_Defina as regras de negócio com exemplos sintéticos e totais conferíveis. Cubra dados
ausentes, vazios ou parciais, e também datas, períodos e dinheiro quando houver._

## Dados, segurança e consistência

_Cubra posse com `WorkOwner` e 404 para recurso alheio, consultas em lote, versão ou lock,
idempotência e migração Flyway aditiva com rollback. Siga
`docs/conventions/backend/security.md` e `docs/conventions/backend/persistence.md`._

## Decisões que exigem aprovação

| Decisão | Proposta | Estado |
| --- | --- | --- |
| <schema, contrato público, auth, remoção de dados, nova dependência ou identidade visual> | <resumo> | <pendente na #N / aprovada em DD/MM/AAAA> |

_Sem decisões desse tipo, escreva “Nenhuma”._

## Referências

_Use fontes oficiais e indique a seção lida e o motivo da consulta. Registre as leituras
que falharam._

## Entregas no Oriens

| Tarefa | Resultado | Dependências |
| --- | --- | --- |
| #<id> | <resultado verificável> | <IDs ou “Etapa inicial”> |

_Os critérios de aceite ficam na descrição de cada tarefa, que começa com o bloco
“Leitura obrigatória” definido na skill de planejamento._

## Fluxo de entrega

- Branch base e alvo dos PRs: <`dev` | branch de integração `refac/<slug>`>. _Com
  integração, cada tarefa parte dela e abre o PR contra ela, nunca contra `dev`._
- Branch da tarefa: `<tipo>/<slug>-<tarefa>-<resumo>`. _Os checks do CI rodam para PRs
  com destino `dev`, `main` ou `refac/**`._
- Antes de abrir o PR, rode `code-review` e `security-review` sobre o diff contra a base
  e registre o resultado na descrição, conforme `docs/guides/pull-request-review.md`.
- Portões de aprovação: <tarefa e decisão da tabela acima, ou “nenhum”>.
- Encerramento: <com integração, um PR leva a branch para `dev` com revisão de todo o
  intervalo; sem integração, “cada PR vai direto para `dev`”>.

## Validação e evidência

_Liste a verificação mínima suficiente de `docs/guides/setup.md` por área, os fluxos de UI
e a regressão visual quando houver. Defina o arquivo de evidência
`docs/plans/AAAA-MM-DD-<slug>-evidence.md`._
