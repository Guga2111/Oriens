# ADR 003 · Versões, locks e If-Match

## Contexto

Uma tarefa pode mudar entre a leitura e o envio de um rascunho. Movimentos
no quadro também precisam coordenar a ordem e os vínculos do projeto.

## Decisão vigente

O contrato de Projetos expõe `version` e `ETag`. Escritas condicionais usam
`If-Match` conforme o endpoint. O
[`WorkHttp`](../../apps/api/src/main/java/com/oriens/oriens_api/controller/WorkHttp.java)
valida a precondição HTTP. `@Version` e locks pessimistas em escritas compostas
protegem o estado no banco.

## Alternativas

A última gravação vencer permitiria perder edições. Um lock sozinho serializa
escritas, mas não diz se os dados consultados pelo cliente ainda estão atuais.
Uma versão apenas no corpo dispensaria a precondição HTTP explícita.

## Consequências

Clientes guardam a versão e preservam o rascunho em conflito. O banco serializa
movimentos que disputam a mesma ordem e os serviços precisam adquirir locks em
ordem consistente. Consulte [HTTP](../conventions/backend/http.md),
[persistência](../conventions/backend/persistence.md) e a
[spec de Projetos](../plans/2026-11-13-projects-refactor-spec.md).
