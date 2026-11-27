# Acessibilidade e testes do cliente

Use Vitest, Testing Library e Playwright. Consulte os [comandos de execução](../../guides/setup.md#cliente).

## Acessibilidade

Mínimo para todo componente:
- Operável só com teclado; foco visível (`ring-ring`); ordem de foco lógica; `Esc` fecha sobreposições.
- Todo controle com nome acessível (`Label` associado, `aria-label` em botão só de ícone, `sr-only` quando
  necessário).
- Contraste AA entre os pares de tokens nos dois temas, incluindo os estados interativos.
- Sem informação só por cor (status com texto/ícone além da cor).
- Atualizações assíncronas relevantes com `role="status"`/`aria-live`; erros com `role="alert"`.
- Respeite `prefers-reduced-motion` em animações próprias.

## Testes

- **Vitest + Testing Library** em `src/__tests__/`: teste comportamento visível (papel, nome acessível, texto),
  não detalhes de implementação. Prefira `getByRole('button', { name: … })` a `getByTestId`.
- Toda regra em `lib/` tem teste unitário.
- Componente com estado de carregando/vazio/erro tem teste dos três.
- Bug corrigido ganha teste que falhava antes.
- **Playwright** (`e2e/`) para fluxos ponta a ponta críticos (criar/editar/concluir tarefa, projeto, financeiro).
- Rode `npm run lint && npm test` antes de abrir PR.

Use a [regressão visual](../../guides/visual-regression.md) para comparar
a renderização em temas e viewports fixos. Os [exemplos do design system](design-system-examples.md#reproduzir-em-claro-e-escuro)
indicam os cenários de referência para ações, formulários e o quadro.
