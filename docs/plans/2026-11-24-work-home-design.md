# Home de Trabalho

**Data:** 2026-11-24  
**Status:** aprovada pelo usuário em 2026-11-24; em implementação.  
**Referência visual:** captura do Plane fornecida pelo usuário.  
**Confirmado pelo usuário:** links rápidos internos e externos, com nome e URL editáveis e salvamento na conta.

## Objetivo e escopo

Adicionar **Início** acima de **Hoje** no menu de Trabalho, em `/home`, preservando `/tasks` como Hoje.
A Home reúne o calendário de frequência já disponível em Métricas, links rápidos personalizados e
itens acessados recentemente. Sem novos módulos além dessas três seções.

## Alternativas consideradas

1. Armazenamento apenas no navegador: menor backend, mas não acompanha a conta em outros dispositivos.
2. Persistência na conta de links e visitas de tarefas/projetos: recomendada; atende à personalização e
   à semântica de recentes, exigindo migração e contratos aditivos.
3. Lista de itens modificados recentemente: reaproveita datas de edição, mas não representa o que foi
   acessado. Não recomendada para esta tela.

## Composição visual

Preservar o shell, tipografia, neutros, primário laranja, raios e componentes do Oriens. A referência
do Plane orienta composição e respiro, sem mudança de identidade visual.

Ordem da página:

1. Saudação com primeiro nome e data em português, considerando o fuso do produto, Recife.
2. Calendário anual de atividade, reutilizando `ActivityCalendar`, seus hooks, regras, navegação por
   período e consulta do detalhe de um dia. Os mesmos dados devem produzir o mesmo resultado em Métricas.
3. **Links rápidos**, com ação **Adicionar link**, cartões compactos e menu para editar ou remover.
4. **Recentes**, com até dez tarefas/projetos, ícone do tipo, título e tempo desde o último acesso.

Coluna central com `w-full max-w-5xl mx-auto`; manter o padding do shell e acrescentar `lg:px-8 xl:px-12`
no conteúdo da Home. Espaçamento vertical pela escala Tailwind. No celular, retirar o padding adicional,
empilhar links e limitar a rolagem horizontal ao calendário. Nenhuma alteração global de padding.

Controles por shadcn: Button, Dialog/ResponsiveDialog, Field, Input, DropdownMenu, Select quando
necessário, Skeleton e Alert/WorkFeedback. Links internos com React Router e composição `asChild`.
Estados de carregamento, vazio, falha e nova tentativa por seção. Foco visível, rótulos e teclado.

## Links rápidos

- Criar, editar e remover links; lista limitada a vinte por conta e ordenada pela criação.
- Nome obrigatório, até 80 caracteres; URL obrigatória, até 2.048 caracteres.
- Aceitar rotas internas reconhecidas do Oriens e URLs externas HTTPS; rejeitar URLs relativas ao
  protocolo, esquemas executáveis e credenciais na URL. Validar no frontend e backend.
- Links internos navegam no app; externos abrem outra aba com `noopener noreferrer`.
- Sem busca de favicon, preview ou conteúdo remoto pelo servidor.
- Formulário mantém os valores em caso de erro; exclusão por confirmação no padrão existente.

## Recentes

- Registrar aberturas de detalhes de tarefas e projetos, incluindo tarefas abertas pelo editor/painel
  compartilhado. Não registrar listagens, prefetch ou leituras de API/MCP como visita.
- Uma entrada por dono, tipo e ID; nova visita atualiza o instante do servidor.
- Ordenação por último acesso decrescente, com desempate determinístico; mostrar até dez entradas.
- Validar posse ao registrar e ao listar. Excluídos/inacessíveis não aparecem; projetos arquivados e
  tarefas de projetos arquivados ficam fora da lista.
- Visita não altera a versão de negócio da tarefa ou do projeto. Falha ao registrar não impede abrir
  o recurso; não repetir mutações de negócio para atualizar o histórico.
- Conta nova mostra orientação de uso, sem preencher recentes com itens não visitados.

## Backend e persistência propostos

Nova migração Flyway aditiva, com o próximo número livre no momento da implementação, para duas tabelas:

- `work_quick_links`: ID, dono, nome, URL, data de criação e versão otimista.
- `work_recent_visits`: dono, tipo de recurso, ID e instante de acesso, com unicidade por dono/tipo/ID
  e índice para consulta por dono e instante. Upsert serializado/atômico para visitas concorrentes.

Usar constraints, chaves e índices adequados; não alterar migrações existentes. Compatibilidade com a
versão anterior da aplicação e rollback da aplicação preservados. Não aplicar em banco compartilhado
como parte desta aprovação.

Contratos aditivos propostos:

- `GET /work/home/quick-links`
- `POST /work/home/quick-links`, com o padrão existente de idempotência de criação.
- `PATCH /work/home/quick-links/{id}` e `DELETE /work/home/quick-links/{id}`, com `If-Match`.
- `GET /work/home/recents`, limitado a dez resultados.
- `POST /work/home/recents`, recebendo tipo e ID, sem dono vindo do cliente.

Dono resolvido por `WorkOwner`; recursos alheios retornam 404. Controllers finos, DTOs em records,
validação estrita e envelope de erros existente. Consultas limitadas e projeção em lote por tipo,
sem consultas em laços. Reaproveitar serviços de leitura e validação existentes onde forem responsáveis
pelas invariantes. Não acrescentar dependências nem alterar autenticação ou MCP.

No frontend, queries e mutações em hook próprio, HTTP em service e chaves de cache com o dono. Atualizar
a Home após mutações e visitas; não compartilhar histórico entre contas.

## Provas e critérios de aceite

- Início aparece acima de Hoje e ativa o contexto Trabalho; Hoje e rotas existentes continuam funcionando.
- Atividade e consulta de um dia usam componentes e semântica existentes de Métricas.
- Links persistem após recarregar e aceitam rotas internas e HTTPS; esquemas inseguros são rejeitados.
- Edição/exclusão respeitam versão; criação repetida respeita idempotência; limite é protegido sob concorrência.
- Visitas repetidas não duplicam entradas; ordem usa instante do servidor; exclusão/arquivamento não deixa
  recursos inacessíveis na lista; a abertura do recurso funciona mesmo se o registro da visita falhar.
- Testes backend com dois usuários, 404 para leitura/escrita/exclusão alheias, consultas em lote,
  concorrência e migração em PostgreSQL descartável.
- Testes frontend de navegação, formulário, erros, estados vazios e abertura dos recentes.
- Executar lint, testes relevantes e build do frontend e testes relevantes do backend. Revisão visual
  em desktop e celular, nos temas claro e escuro, com evidência após implementação.

## Cuidados com o estado atual

Há alterações locais preexistentes em objetivos, sidebar, Hoje e tokens. Preservá-las e integrar somente
os pontos necessários à Home. O `RTK.md` referenciado na instrução de entrada não foi encontrado no
repositório nem nos diretórios de skills consultados.
