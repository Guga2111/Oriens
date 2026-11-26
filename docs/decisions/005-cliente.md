# ADR 005 · shadcn/ui e TanStack Query no cliente

## Contexto

A SPA oferece os mesmos campos, ações e feedback em várias telas. Dados do
servidor precisam permanecer coerentes entre quadro, detalhes e listas.

## Decisão vigente

Use os primitivos locais de
[`components/ui`](../../apps/client/src/components/ui/) com Radix e tokens do
Oriens. Hooks TanStack Query como
[`useWork.ts`](../../apps/client/src/hooks/useWork.ts) organizam leituras e
escritas do domínio. `workKey` inclui usuário e recorte. Serviços ficam com o
HTTP e hooks cuidam da invalidação.

## Alternativas

Criar controles por tela duplicaria foco, variantes e estados. Adotar um kit
fechado reduziria a edição direta dos primitivos. Buscar dados com efeitos e
estado local exigiria recriar cache, cancelamento e invalidação.

## Consequências

Primitivos versionados precisam de revisão quando atualizados. Mudanças nos hooks
precisam preservar identidade das chaves, escopo e concorrência. Consulte a
[spec de frontend](../specs/oriens-frontend-refactor.md), o
[guia de componentes](../conventions/frontend/components.md) e o
[guia de dados](../conventions/frontend/data.md).
