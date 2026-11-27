# Exemplos de composição do Oriens

Os exemplos abaixo usam os componentes do cliente e os estados cobertos pelo
Playwright. Consulte o [guia do design system](design-tokens.md) e o
[catálogo](design-token-catalog.md) para escolher os tokens da composição.

## Ação principal que navega

Na landing, `Button` aplica a variante padrão a um `Link` do React Router.
O tamanho `lg` vem do primitivo e a rota conserva a semântica de link.
O fundo e o texto vêm de `primary` e `primary-foreground`. Veja
[`LandingPage`](../../../apps/client/src/pages/LandingPage.tsx) e
[`Button`](../../../apps/client/src/components/ui/button.tsx).

```tsx
<Button size="lg" asChild>
  <Link to="/auth">Começar agora</Link>
</Button>
```

Em `/`, confira o texto sobre o fundo laranja, o foco visível e a navegação
por Enter para **Entrar no Oriens**. A suíte compara a landing nos quatro
projetos e verifica a navegação. Veja o
[teste de entrada](../../../apps/client/e2e/visual/surfaces.spec.ts).

## Campo com erro em uma sobreposição

Em **Hoje**, abra **Nova Tarefa** e envie o formulário sem título.
`TaskEditor` compõe `DraftDialog` sobre `ResponsiveDialog`, que renderiza
`Drawer` até 639 px e `Dialog` em telas mais largas. O corpo rola dentro da
sobreposição, com altura limitada por `max-h-dialog`. O botão fica no
rodapé e usa `form="task-editor"` para enviar o formulário. Veja
[`TaskEditor`](../../../apps/client/src/components/tasks/TaskEditor.tsx) e
[`ResponsiveDialog`](../../../apps/client/src/components/common/ResponsiveDialog.tsx).

```tsx
<Field data-invalid={!!error}>
  <FieldLabel htmlFor="task-title">Título</FieldLabel>
  <Input
    ref={titleInput}
    id="task-title"
    value={draft.title}
    onChange={event => change('title', event.target.value)}
    maxLength={200}
    required
    aria-invalid={!!error}
    aria-describedby={error ? 'task-validation' : undefined}
  />
  {error && <FieldError id="task-validation">{error}</FieldError>}
</Field>
```

Confira a mensagem **Informe o título da tarefa.**, o foco no campo **Título**
e a descrição acessível associada ao erro. Com o rascunho intacto, Escape
fecha a sobreposição. Veja o
[teste de edição](../../../apps/client/e2e/visual/surfaces.spec.ts).

## Etiqueta e painel de filtros no quadro

O quadro mostra o nome da etiqueta no cartão e usa `TaskLabelBadge` para
escolher a variante. Na fixture visual, `BLUE` mapeia para `label-blue`,
que emparelha `bg-label-blue` com `text-label-blue-foreground`. O mesmo
cartão exibe a etiqueta **Site** nos dois temas. Veja
[`TaskLabels`](../../../apps/client/src/components/tasks/TaskLabels.tsx) e o
[mapeamento de variantes](../../../apps/client/src/lib/task-labels.ts).

```tsx
<TaskLabelBadge label={{ name: 'Site', color: 'BLUE' }} />
```

Acima de 639 px, o quadro usa `w-board-column` e mantém a rolagem das colunas
dentro da área do quadro. Até 639 px, `WorkSelect` troca a coluna e a
coluna visível usa `w-full`. Os filtros reaproveitam `HeaderFilterPanel`
com `PopoverTrigger asChild` a partir de 1024 px e `SheetTrigger asChild`
em telas menores.
Abra **Filtros do quadro** por teclado, selecione **Prioridade** e confira
as opções com texto, o foco e o fechamento por Escape. Veja
[`ProjectBoard`](../../../apps/client/src/components/projects/ProjectBoard.tsx),
[`HeaderFilterPanel`](../../../apps/client/src/components/common/HeaderFilterPanel.tsx)
e o [teste do quadro e dos filtros](../../../apps/client/e2e/visual/project-board.spec.ts).

## Reproduzir em claro e escuro

Siga o [guia de regressão visual](../../guides/visual-regression.md) para usar a
mesma imagem Linux do CI. As fixtures usam dados sintéticos e Inter local.
Dentro do ambiente documentado, execute os quatro cenários dos exemplos
com o comando abaixo, a partir de `apps/client`.

```sh
npm run test:visual -- --grep 'landing e navegação|editor de tarefas com título obrigatório|quadro do projeto em claro e escuro|painel de filtros do quadro em claro e escuro'
```

Confira os projetos `desktop-light`, `desktop-dark` (1440×900),
`mobile-light` e `mobile-dark` (390×844). Para inspeção interativa, confirme
a classe de tema em `<html>` e siga os
[critérios de acessibilidade e testes](tests.md).
