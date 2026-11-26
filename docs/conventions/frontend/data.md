# Dados e formulários do cliente

Use os contratos da API e os hooks do domínio para cache, concorrência e validação.

## Dados: servidor e cache

Fluxo: **`services/*Service.ts`** (HTTP, tipado, recebe `AbortSignal`) → **hook em `hooks/`** (`useQuery`/
`useMutation` com chave de `workKey`) → **componente**.

✅ **Padrão** (`hooks/useWork.ts`):

```ts
export const workKey = (user: number | null, family: string, ...params: unknown[]) =>
  ['work', user, family, ...params] as const;

export function useTaskDay(date: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: workKey(userId, 'tasks/day', date),
    enabled: userId !== null && enabled,
    queryFn: ({ signal }) => taskService.day(userId!, date, signal),
  });
}
```

Regras:
- **Chave de query sempre por `workKey`**, com o usuário na chave (troca de conta não reaproveita cache).
- **Mutação invalida/atualiza** as chaves afetadas no próprio hook (`setQueryData` do detalhe +
  `invalidateQueries` com predicado), não no componente.
- **Concorrência**: escritas enviam a `version` lida (`If-Match`); 409 mostra a mensagem de `workError` e
  **preserva o rascunho** do usuário.
- **Criação** usa `useCreationAttempt` (mesma `Idempotency-Key` em reenvio).
- **Erros de API** passam por `workError` (`lib/work-form.ts`) e aparecem com `WorkFeedback` ou no `FieldError`
  do campo indicado por `fieldErrors`.
- Respostas de `/task` e `/project` são verificadas por `assertWorkIdentity` no interceptor; não remova.

❌ **Antipadrões**
- `axios`/`fetch` dentro de componente ou página.
- Chave de query escrita à mão (`['tasks', id]`) — some da invalidação e gera dados velhos.
- Filtrar/ordenar/paginar no cliente uma lista que a API pagina.
- **N+1 no front**: buscar detalhes item a item em laço (`tasks.map(t => useTaskDetail(t.id))` ou
  `Promise.all(ids.map(get))`). Se a tela precisa de dados agregados, a API deve devolvê-los em lote — peça
  o endpoint.
- Confiar no front para autorização. Esconder um botão é UX; a garantia é do backend.
- Guardar no `localStorage` qualquer coisa além do token e preferências já existentes.

## Filtros de tarefas

Use `taskFilterSections` com `HeaderFilterPanel` no quadro e em Explorar.
A busca por título ou descrição fica na barra de ações, em `HeaderSearch`,
e é aplicada ao enviar o campo.
No desktop, as opções abrem ao lado das categorias. No celular, toque em uma
categoria para ver suas opções e use a seta de voltar para trocar de categoria.
O quadro guarda o recorte na URL e filtra dentro do projeto aberto. O contador
de itens no breadcrumb usa o total visível retornado pelo quadro.
Explorar oferece o seletor de projeto e volta à primeira página a cada alteração.
Os períodos de 7 e 30 dias incluem hoje, e “Este mês” cobre o mês inteiro no calendário de Recife. O período personalizado
permite informar uma data inicial, uma data final ou as duas.

## Movimentos no quadro

No desktop, arraste pelo card ou use as ações do menu para mudar de coluna ou
posição. Durante o arraste, o contorno tracejado indica onde o card ficará ao
soltar, inclusive em uma coluna vazia. Com filtros ativos, o arraste entre
colunas insere o card no fim do destino. Pelo teclado, use Espaço no título para
pegar ou soltar, as setas para escolher o destino e Escape para cancelar. Enter
abre os detalhes quando o card está em repouso. No celular, o movimento continua
disponível pelo menu.

O hook de movimento mantém a projeção otimista no cache do quadro e reserva
apenas o card em salvamento no desktop. Os envios do mesmo projeto passam em
sequência para usar as versões confirmadas do projeto e das tarefas. Em caso
de erro, o hook restaura a posição anterior, reaplica os demais movimentos
pendentes e mostra a mensagem de `workError` em um toast.

## Formulários

No editor de tarefas, o horário é opcional após selecionar o dia planejado.
O campo aceita `0930` pelo teclado numérico, além de `9:30` e `09:30`. O formulário
envia esses valores como `09:30:00` e mostra erros de formato junto ao campo.

✅ **Padrão** (ex.: `TaskEditor`, diálogos financeiros):
- Layout com `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldSet`/`FieldLegend`.
- `<form noValidate onSubmit={…}>` e `<fieldset disabled={pending}>` durante envio; botão de envio com estado
  de carregando.
- Validação em funções puras e testadas em `lib/<domínio>-form.ts` (ex.: `validCalendarDate`), espelhando as
  regras da API; a API continua sendo a autoridade.
- Erro de campo: `Field data-invalid` + `aria-invalid` no controle + `FieldError` com a mensagem.
- Diálogos de edição usam `ResponsiveDialog` (Dialog no desktop, Drawer no mobile) e `DraftDialog` quando
  há rascunho a proteger.

❌ **Antipadrões**
- Validação só no `onClick` do botão, sem `form`/submit (quebra Enter e leitores de tela).
- Mensagem de erro genérica no topo quando a API disse qual campo falhou.
- Dois estilos de formulário no mesmo fluxo (estado controlado em um campo e `react-hook-form` em outro).
