# Estrutura do cliente

O cliente em `apps/client/` usa Vite, React 18, TypeScript, Tailwind CSS 3, shadcn/ui (Radix, estilo `default`, base `slate` e CSS variables), TanStack Query 5, Axios, date-fns, lucide-react, recharts e sonner.

Consulte o [catálogo de dependências do cliente](../../guides/client-stack.md).

## Estrutura de pastas

```
src/
  components/ui/          shadcn: gerado pelo CLI. Só edite para adaptar a tokens/variantes do Oriens.
  components/common/      Composições reutilizáveis do produto (PageHeader, ResponsiveDialog, ConfirmDialog,
                          WorkFeedback, WorkCombobox, WorkDatePicker, WorkSelect…)
  components/<domínio>/   tasks, projects, financial, statistics, dashboard, settings, layout…
  pages/                  Uma por rota; compõe componentes, não contém regra de negócio extensa
  hooks/                  useWork, useStatistics, useTaskLabels…: queries, mutações e estado derivado
  services/               Chamadas HTTP (axios, `services/api.ts`); sem estado nem React
  lib/                    Funções puras: datas, dinheiro, formatação, validação de formulário, rótulos
  types/                  Tipos dos contratos da API
  context/                Auth e Settings (estado global mínimo)
  __tests__/              Testes Vitest
```

Regra de dependência: `pages → components → hooks → services → api`. `lib/` e `types/` podem ser usados
por todos. Componente nunca importa `axios` nem `services/api` diretamente.

## Componentes React

✅ **Padrão**
- Componentes de função, nomeados (`export function TaskRow`), um componente principal por arquivo, arquivo
  com o mesmo nome em PascalCase.
- Props tipadas com `type`/`interface` explícito; sem `React.FC`.
- Componente pequeno e com um propósito. Passou de ~200 linhas ou mistura busca de dados + layout + regra?
  Extraia hook (`hooks/`) ou função pura (`lib/`).
- Estado derivado é **calculado**, não sincronizado com `useEffect` + `setState`.
- Listas com `key` estável (ID do domínio), nunca índice quando a lista reordena.
- Textos de UI em pt-BR; rótulos de enum vêm de `lib/labels.ts` (`TASK_STATUS`…), não repetidos.
- Datas com `date-fns` e helpers de `lib/date.ts`/`lib/product-time.ts`; "hoje" do produto via
  `useProductToday`/`productNow`, nunca `new Date()` espalhado. Dinheiro via `lib/money.ts`.
- Carregando / vazio / erro **sempre** tratados: `Skeleton`/`Spinner`, `Empty`, `WorkFeedback` com
  "Recarregar dados".

❌ **Antipadrões**
- `useEffect` para buscar dados (use TanStack Query) ou para copiar prop em estado.
- Prop drilling de 3+ níveis para dado de servidor — leia pelo hook de query onde precisa (o cache é
  compartilhado).
- Contexto novo para dado de servidor (Context é para Auth/Settings).
- `console.log` / `console.error` deixado no código (inclusive em `services/`).
- Componentes gigantes com JSX denso em uma linha só; quebre por legibilidade.
- Lógica de negócio duplicada entre front e back (ex.: recalcular status de atraso de forma diferente da API).

## TypeScript

O `tsconfig` ainda é permissivo (`strict: false`) por histórico. **Código novo escreve como se fosse strict**:
- Sem `any` (use `unknown` + estreitamento); sem `as` para silenciar o compilador.
- Tipos de contrato da API em `types/` e reaproveitados (não redeclare `Task` dentro do componente).
- Uniões literais para estados (`'PENDING' | 'ON_DOING' | …`), não `string`.
- Não use `!` (non-null) fora do padrão `enabled: userId !== null` + `userId!` no `queryFn`.
