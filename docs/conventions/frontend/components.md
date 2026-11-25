# Componentes shadcn/ui

Use os primitivos versionados em `apps/client/src/components/ui/`.

## shadcn primeiro

### A regra

**A UI do Oriens não usa primitivos HTML crus para nada que tenha equivalente no shadcn.** Todo controle
interativo, de formulário, de sobreposição ou de dados vem de `@/components/ui` (ou de uma composição em
`components/common` construída sobre eles). Motivo: foco, teclado, ARIA, estados (`disabled`,
`data-[state]`), tema escuro e tokens já vêm resolvidos e consistentes.

| ❌ Não use | ✅ Use |
|---|---|
| `<button>` | `Button` (`variant`: default, secondary, outline, ghost, link, destructive; `size`: default, sm, lg, icon) |
| `<button>` como gatilho de Popover/Tooltip/Dropdown | `<PopoverTrigger asChild><Button variant="ghost">…` |
| `<input>` | `Input`; `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `InputOTP` conforme o tipo |
| `<input type="date">` | `WorkDatePicker` (Popover + `Calendar`) |
| `<input type="file">` | `Input type="file"` ou `Button` que aciona um `Input` oculto com `Label` |
| `<select>` | `Select` (lista curta), `WorkSelect`, `WorkCombobox` (`Command` + `Popover`, lista longa/buscável) |
| `<textarea>` | `Textarea` |
| `<label>` | `Label` / `FieldLabel` |
| `<fieldset>` / `<legend>` | `FieldSet` / `FieldLegend` |
| texto de erro solto | `FieldError` dentro de `Field data-invalid` |
| `<table>` | `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` |
| `<dialog>`, modal feito à mão | `Dialog` / `AlertDialog` / `Sheet` / `Drawer` — no produto, `ResponsiveDialog` e `ConfirmDialog` |
| `window.confirm` / `alert` | `ConfirmDialog` / `AlertDialog` |
| tooltip com `title=""` | `Tooltip` |
| menu feito com `div` + estado | `DropdownMenu`, `ContextMenu`, `Menubar` |
| abas feitas à mão | `Tabs` ou `ToggleGroup` |
| `<hr>` | `Separator` |
| `<progress>` | `Progress` |
| `<img>` de usuário | `Avatar` (`AvatarImage` + `AvatarFallback`) |
| `<img>` de capa | `AspectRatio` + `img` com `alt` |
| spinner/“Carregando…” à mão | `Spinner`, `Skeleton` |
| estado vazio à mão | `Empty` |
| caixa de aviso à mão | `Alert` (no produto, `WorkFeedback` para erros de API) |
| toast próprio | `toast` do `sonner` |
| `<a href="/rota">` | `Link` do react-router; com aparência de botão: `<Button asChild><Link to="…">` |
| `<a href="https://…">` | `<Button asChild variant="link"><a href rel="noopener noreferrer" target="_blank">` |

**Permitido**: elementos de estrutura e texto sem comportamento — `div`, `section`, `header`, `main`,
`nav`, `aside`, `footer`, `article`, `ul`/`ol`/`li`, `p`, `h1`–`h6`, `span`, `strong`, `time`, `form`
(com `Field*` dentro). Prefira o elemento semântico correto a `div`.

### Quando o componente não existe

Ordem de busca:

1. **Já está em `src/components/ui/` ou `components/common/`?** Use. Não crie um segundo combobox, dialog
   ou date picker.
2. **Existe no shadcn/ui oficial?** Adicione pelo CLI (veja a skill/MCP do shadcn se estiver usando um agente):
   ```sh
   npx shadcn@latest add <componente> --dry-run   # veja o que será criado/alterado
   npx shadcn@latest add <componente> --diff      # se tocar em arquivos existentes
   npx shadcn@latest add <componente>
   ```
   Nunca use `--overwrite` em `components/ui` sem aprovação: os arquivos já foram adaptados aos tokens.
3. **Existe no ecossistema da comunidade em [shadcn.io](https://www.shadcn.io)?** Consultar e usar é
   permitido, com estas condições:
   - **Licença** declarada e compatível (MIT ou equivalente). Itens **Pro/pagos** ou sem licença declarada
     servem só como referência de ideia — não copie o código.
   - **Sem dependência nova pesada** sem aprovação (ex.: componentes de gráfico do shadcn.io usam outra lib
     de charts; no Oriens, gráficos são **recharts** via `ui/chart.tsx`).
   - Deve ser **Radix + Tailwind 3**, compatível com React 18. Variante Base UI ou Tailwind 4 exige adaptação.
   - Depois de instalar, **adapte aos tokens** (remova hex, paleta crua e medidas arbitrárias) e aos textos
     em pt-BR. O shadcn.io não é afiliado ao shadcn/ui oficial: revise o código como código de terceiros.
   - Registre a origem (URL) no PR.
4. **Nada serve?** Componha a partir dos primitivos shadcn (`Button`, `Popover`, `Command`…) em
   `components/common/` (genérico) ou `components/<domínio>/` (específico).
5. **Exceção real** (ex.: célula de matriz com semântica de grade, marcador posicionado em linha do
   tempo): é permitido elemento nativo **se** nenhum componente shadcn atender, com estilos só de token,
   foco visível e nome acessível. Marque a linha com a desativação do ESLint, sempre com motivo:
   ```tsx
   // eslint-disable-next-line no-restricted-syntax -- shadcn-exception: <motivo>
   {/* eslint-disable-next-line no-restricted-syntax -- shadcn-exception: <motivo> */}  // dentro de JSX
   ```
   O texto `shadcn-exception` torna a exceção buscável (`grep -rn shadcn-exception src`) e revisável.
   Exceções atuais: marcador da `DayLine` e célula do `ActivityCalendar`.

### Variantes, não classes soltas

Diferenças visuais recorrentes viram **variante** (`cva`) no componente, não `className` repetido:

```tsx
// ❌ cópia do mesmo estilo em 6 lugares
<Button className="h-8 px-2 text-xs text-muted-foreground hover:bg-transparent">…</Button>

// ✅ variante/size definido uma vez em ui/button.tsx (ou um componente em common/)
<Button variant="ghost" size="sm">…</Button>
```

`className` no uso serve para **layout** (posição, margem externa, largura em grid), não para redesenhar o
componente. Combine classes com `cn()` de `@/lib/utils`, nunca concatenando strings.
