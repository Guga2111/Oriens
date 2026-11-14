# Projetos — design validado

Data: 2026-11-13. Status: aprovado em conversa; documentação da etapa de design, sem implementação.

SPEC e plano de execução: [2026-11-13-projects-refactor-spec.md](2026-11-13-projects-refactor-spec.md).

## Problema e intenção

O Oriens precisa ajudar uma pessoa a transformar resultados desejados em próximos passos e acompanhar sua execução diária. Objetivos e tarefas continuam conceitos distintos. O projeto de desenvolvimento conecta suas tarefas ao Hoje, sem cópias e sem acrescentar gestão empresarial.

## Processo e evidências

Aplicadas as skills `brainstorming-skill` e `design-taste-frontend`, com leitura integral de `references/app-screens.md`. Sequência seguida: investigação, perguntas individuais, comparação de abordagens e aprovação das partes do design. A implementação está fora desta entrega.

- Base investigada: commit `1418930`, planos de cards e detalhe de 2026-11-13 e SPEC histórica `docs/specs/oriens-frontend-refactor.md`.
- Revisados frontend, serviços, controladores, entidades, repositórios, consumidores de datas, testes e commits recentes.
- Observadas no Brave local as telas Hoje, Projetos e detalhe; consultada a captura móvel versionada do detalhe. Não houve nesta etapa uma nova inspeção automatizada em três larguras, nem teste de mutações na conta real.
- As instruções fornecidas e `/Users/luisgosampaio/.codex/AGENTS.md` referenciam `RTK.md`. Esse arquivo não foi encontrado nos diretórios consultados. Nenhum `AGENTS.md` adicional foi encontrado dentro do checkout.
- Os planos anteriores são evidência histórica, não autorização para implementar esta refatoração.

Para comparar abordagens, foi usado o padrão 7A, *Build-Within-Constraint Formula*, de `brainstorming-skill/references/pattern-categories-and-documentation.md`. Seu template é:

> Generate [number] ideas to [solve challenge] with these hard constraints:
> - Constraint 1: [specific limitation that cannot be violated]
> - Constraint 2: [specific limitation that cannot be violated]
> - Constraint 3: [specific limitation that cannot be violated]
>
> These constraints are MANDATORY, not negotiable.
>
> For each idea generated, explicitly show: How does this work WITHIN these constraints?
>
> Format: Idea | How It Works Within Constraints | What It Enables | Trade-offs

As restrições aplicadas foram: preservar os dois modos, manter objetivos separados de tarefas, compartilhar identidade com Hoje e reutilizar a stack.

## Abordagens comparadas

| Abordagem | Experiência | Arquitetura e complexidade | Resultado |
| --- | --- | --- | --- |
| Kanban principal, objetivos em aba | Execução acessível ao abrir o projeto; próximos passos também podem nascer do objetivo | Estender a tarefa existente e adicionar colunas; menor quantidade de telas e agregações | Escolhida pelo usuário |
| Objetivos principais, quadro secundário | Favorece decomposição dos resultados; exige mais navegação para executar | Mesma identidade de tarefa, com agrupamentos adicionais por objetivo | Não escolhida |
| Resumo de atenção como entrada | Facilita revisão, mas sobrepõe parte do papel de Hoje | Acrescenta resumo, consultas e uma terceira superfície | Não escolhida |

Na comparação inicial, as três alternativas preservavam projetos atuais como simples. Posteriormente, o usuário escolheu reset completo do banco; não haverá migração desses registros. Essa mudança não altera a arquitetura escolhida.

## Decisões aprovadas

| ID | Decisão |
| --- | --- |
| D01 | Dois modos: simples e desenvolvimento |
| D02 | Simples mantém objetivos, prazos e conclusão manual |
| D03 | Desenvolvimento abre no Kanban; objetivos ficam em aba própria |
| D04 | Uma tarefa tem o mesmo ID, conteúdo e situação no projeto e em Hoje |
| D05 | Vínculo da tarefa com um objetivo do seu projeto é opcional |
| D06 | Criar tarefa no quadro não a agenda automaticamente |
| D07 | Dia planejado e prazo final são independentes e opcionais |
| D08 | Horário é opcional e exige dia planejado |
| D09 | Planejamentos não concluídos aparecem em pendentes anteriores, sem reagendamento automático |
| D10 | Hoje também mostra atenção aos prazos, sem repetir a mesma tarefa em suas listas |
| D11 | Timeline existente e marcador “agora” são preservados; tarefas sem horário não recebem posição artificial |
| D12 | Colunas iniciais: A fazer, Fazendo e Concluídas |
| D13 | É possível criar, renomear e reordenar colunas, atribuindo significado A fazer, Fazendo, Concluída ou Cancelada |
| D14 | Backlog, Em teste, Bloqueadas e Canceladas são possibilidades, não colunas obrigatórias |
| D15 | Concluir em Hoje envia à coluna padrão de conclusão; reabrir envia à padrão A fazer |
| D16 | Cancelar preserva a tarefa e datas; retira das listas de execução e não conta como realização |
| D17 | Objetivos são concluídos e reabertos manualmente; tarefas nunca os concluem automaticamente |
| D18 | Listagem mantém cards compactos, orientados a atenção e próxima tarefa planejada |
| D19 | Mesmo editor responsivo em Hoje e no quadro, com Salvar explícito e conteúdo preservado em caso de erro |
| D20 | Planejar depois do prazo gera aviso, não bloqueio |
| D21 | Conversão simples → desenvolvimento preserva objetivos e cria quadro vazio; conversão inversa fora do MVP |
| D22 | Arquivar organiza a listagem; não pausa tarefas nem as remove de Hoje |
| D23 | Excluir projeto preserva suas tarefas como avulsas; exclui objetivos e estrutura do quadro |
| D24 | Excluir objetivo desvincula suas tarefas; não as exclui |
| D25 | Excluir coluna com tarefas exige destino; padrões obrigatórios precisam de substituição |
| D26 | Desenvolvimento mostra contagens distintas de objetivos e tarefas, sem percentual global de alcance |
| D27 | Canceladas ficam fora do denominador das tarefas, com contagem separada |
| D28 | Filtros de quadro: objetivo, planejadas para hoje, sem planejamento e prazo ultrapassado |
| D29 | Planejar mostra a quantidade já planejada no dia, sem afirmar disponibilidade de tempo |
| D30 | Reset completo do banco substitui a migração dos registros antigos; backup e reset serão etapas futuras explícitas |
| D31 | Objetivos passam a ter ID estável; escritas autorizadas, atômicas e protegidas contra edição simultânea |
| D32 | Datas de calendário não são convertidas para UTC; fuso do MVP é America/Recife para agenda, agora e lembretes |
| D33 | Preservar stack e componentes adequados; inspecionar implementação futura no navegador, nos dois temas e em três larguras |

## Direção visual

Manter a identidade Horizonte, os tokens existentes de creme/bordô, Inter, o shell, componentes Radix/shadcn e superfícies planas. `.taste-skill/direction.json` registra `editorial-greeting`, seed `275775847`, preservando palette/type. Não houve novo sorteio nem alteração desse arquivo.

Manter a composição útil dessa referência, sem introduzir saudação ou título de landing page. O registro atual foi feito para detalhe e não é, sozinho, uma especificação de Kanban: a estrutura do quadro vem dos objetos e tarefas aprovados nesta conversa. Revisar densidade e hierarquia, não a marca. As exceções de paleta existentes devem ser justificadas na inspeção; não tratar avisos como automaticamente aprovados.

O elemento próprio do Oriens é a ligação entre **objetivo → próxima tarefa → dia de execução**, com a timeline como representação do dia. Cor pessoal identifica o projeto; cor semântica comunica atenção e situação, sem substituir texto.

| Tela | Pergunta principal |
| --- | --- |
| Projetos | Qual projeto precisa da minha atenção e qual é a próxima ação planejada? |
| Criação | Preciso apenas acompanhar objetivos ou também organizar tarefas em quadro? |
| Simples | Quais objetivos ainda faltam e quais têm prazo? |
| Quadro | Qual tarefa vou mover, executar ou planejar agora? |
| Objetivos | Que resultado quero alcançar e quais passos contribuem para ele? |
| Editor | O que fazer, quando pretendo fazer e qual é o prazo real? |
| Hoje | O que planejei, o que ficou pendente e quais prazos exigem decisão? |

## Composições aprovadas

### Listagem

Cards com nome, modo, sinal de atenção e próxima tarefa planejada ou próximo objetivo. Duas ou três colunas conforme espaço; uma no celular. Capa opcional e secundária. Sem tarefa planejada: “Nenhuma tarefa planejada” e “Planejar próxima tarefa”. Não inventar uma recomendação com base na posição de uma tarefa.

### Criação

Um formulário: nome obrigatório; escolha explícita do modo; descrição, cor e objetivos opcionais. Capa adicionada depois. Desenvolvimento cria as três colunas padrão sem tarefas.

### Detalhes

Simples mantém objetivos como área principal e resumo/calendário como apoio. Desenvolvimento abre em Quadro e tem aba Objetivos. Cada objetivo permite adicionar tarefa já vinculada. No celular, objetivos precedem o resumo no modo simples; o quadro mostra uma coluna por vez com seletor e contagens.

### Hoje

```text
Hoje                                      + Nova tarefa
Timeline existente: manhã | tarde | agora | noite

Planejado para hoje
  Sem horário
  Manhã / Tarde / Noite
  Concluídas (recolhido)

Pendentes de dias anteriores
  [Fazer hoje] [Reagendar] [Retirar do planejamento]

Prazos que precisam de atenção
  Prazo termina hoje / Prazo ultrapassado
```

Cada tarefa aparece em uma lista, com avisos adicionais na própria linha quando se enquadra em mais de uma condição. A marca na timeline é outra representação do mesmo ID, não uma tarefa adicional.

## Limite desta etapa

O usuário aprovou cada parte acima e a consolidação da SPEC. Isso não inicia implementação, reset, deploy nem contratação de dependências. O plano executável está na SPEC. Dados ilustrativos nos wireframes são exemplos de design, não medições da conta real.
