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

## Formulários

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
