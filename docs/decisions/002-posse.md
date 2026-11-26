# ADR 002 · Posse na consulta e resposta 404

## Contexto

IDs de tarefas, projetos e vínculos chegam de clientes autenticados. A
autenticação identifica o ator e a consulta precisa impor o recorte da conta.

## Decisão vigente

[`WorkOwner`](../../apps/api/src/main/java/com/oriens/oriens_api/security/WorkOwner.java)
resolve o dono. Repositórios como
[`TaskRepository`](../../apps/api/src/main/java/com/oriens/oriens_api/repository/TaskRepository.java)
aplicam o dono no filtro. Quando um recurso não é visível para o dono, a API
responde 404. Escritas também validam os IDs dos vínculos.

## Alternativas

Carregar só por ID e conferir depois espalharia verificações que podem ser
esquecidas. Retornar 403 para recursos alheios exporia sua existência.

## Consequências

Mantenha o filtro também em listas, contagens, buscas e locks. Consulte o
[guia de autorização](../conventions/backend/security.md) e o
[contrato de Projetos](../contracts/projects-v2.md).
