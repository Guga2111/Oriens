# Objetivos — lista compacta e detalhes

Status: aprovado pelo usuário em 24/11/2026. Nome mantido: **Objetivos**.

## Escopo aprovado

Lista compacta com progresso das tarefas, título, período, seletor de status e menu. Remover formulário permanente e abas binárias. Criação em diálogo pelo botão Novo objetivo no cabeçalho. Detalhes em painel lateral no desktop e tela inteira no celular: título, descrição simples, status, início/término e tarefas vinculadas. Edição direta de período/status na lista. Filtro por status. Preservar vínculo, criação e abertura das tarefas e exclusão do objetivo sem apagar tarefas.

## Contratos e dados

Evolução aditiva: description (até 10000 caracteres), startDate opcional e status de criação opcional. dueDate continua representando término; não renomear o contrato existente. Preservar PENDING (Planejado) e CONCLUDED (Concluído); adicionar BACKLOG, ON_DOING, PAUSED e CANCELLED. Novos objetivos na UI começam em BACKLOG; clientes antigos sem status mantêm PENDING. Sem reclassificação dos dados antigos. Início e término podem ser informados isoladamente; juntos exigem início <= término. PATCH ausente preserva, null limpa campos opcionais. Não alterar automaticamente status quando tarefas chegam a 100%. Contagens de tarefas excluem canceladas do denominador. Objetivos concluídos/cancelados ficam fora de atraso e próximo objetivo. Manter posse, versão e idempotência, inclusive hashes de requisições antigas. Atualizar projeções e catálogo MCP para os campos aditivos.

## Interface

Preservar primário laranja, tipografia, raios e tokens vigentes. Usar controles shadcn existentes e ícones de estado, sem nova dependência ou mudança global no design system. Linhas compactas no desktop; metadados em segunda linha no celular e controles com alvos confortáveis. Lista vazia, filtro sem resultado, carregamento/erro das tarefas e falhas de gravação explícitos. Rascunhos preservados em erro/conflito, confirmação de descarte e exclusão. Descrição em texto simples. Datas em pt-BR e calendário local, sem conversão UTC.

## Provas

Testes de criação/edição, seis estados, limpeza parcial e validação cruzada de datas, posse, concorrência e compatibilidade de idempotência. Testes de UI para criação, filtros, edição direta, detalhe e tarefas. Lint/build e verificação visual desktop/mobile com os dois temas. Migrações apenas em PostgreSQL descartável, nunca no banco compartilhado.

## Ajuste solicitado em 24/11/2026 — consulta antes da edição

Clicar no objetivo da lista abre sheet lateral de informações, seguindo a referência adicional enviada pelo usuário. Título e descrição em leitura, propriedades de status/período com edição direta, progresso e distribuição das tarefas por estado, além das tarefas vinculadas. Seções recolhíveis. A edição completa fica em uma ação explícita no menu da lista ou do sheet e abre diálogo com proteção de rascunho; cancelar retorna ao sheet quando aberto. Não adicionar responsáveis, membros ou bloqueios sem suporte no domínio. Sem mudança de design system ou backend.

## Distribuição e comportamento do sheet

Solicitado pelo usuário: seção Distribuição (equivalente a Breakdown), com abas Estado, Etiquetas e Prioridades, baseada no Tabs existente do shadcn. Cada grupo mostra contagem, percentual e barra proporcional. Denominador: todas as tarefas vinculadas, incluindo canceladas. Etiquetas podem se sobrepor; informar essa regra e incluir Sem etiquetas. O progresso geral mantém seu denominador anterior, sem canceladas. Usar o Sheet em modo não modal (`modal={false}`), como TaskPeek: fundo sem overlay escuro e lista acessível. Nenhuma alteração no componente base ou design system.
