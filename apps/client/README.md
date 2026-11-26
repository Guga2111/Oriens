# Cliente Oriens

SPA em React e TypeScript com Vite. Use Node 22 e instale as dependências pelo
`package-lock.json`.

```sh
npm ci
npm run dev
```

Execute em `apps/client/`. Abra `http://localhost:5173`, origem aceita pela API. Use o
[ambiente local](../../docs/guides/setup.md#ambiente-local) para subir a API.
Em desenvolvimento, `VITE_API_BASE_URL` pode apontar para outra API de teste.
A [seção do cliente no setup](../../docs/guides/setup.md#cliente) cobre lint,
testes, build e Playwright.

- [Índice da documentação do Oriens](../../docs/README.md)
- [Convenções do cliente](../../docs/conventions/frontend.md)
- [Design system](../../docs/conventions/frontend/design-tokens.md)
- [Dependências do cliente](../../docs/guides/client-stack.md)
