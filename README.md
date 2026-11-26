# Oriens

Gestão pessoal de tarefas, projetos, hábitos, estatísticas e finanças, com integração MCP.

- [API](apps/api/) em Java 25, Spring Boot 4.2 e PostgreSQL 15.
- [Cliente](apps/client/README.md) em React, TypeScript e Vite.

## Caminho rápido

Na raiz, execute `make help` para ver os atalhos. Para abrir o ambiente local,
instale os pré-requisitos do [setup](docs/guides/setup.md), copie
[.env.example](.env.example) para `.env` e configure `JWT_SECRET` com uma
chave local de pelo menos 64 bytes. Você pode gerá-la com `openssl rand -hex 64`.

```sh
npm --prefix apps/client ci
make dev
```

Abra [o cliente local](http://localhost:5173). A API fica em
`127.0.0.1:8080`. Use Ctrl+C para parar o Vite. Para parar também a API e o
banco local, rode `docker compose -f ops/compose/docker-compose.dev.yml stop`.

Siga o [índice da documentação](docs/README.md) e o
[AGENTS.md](AGENTS.md) para contribuir. Use a
[política de segurança](SECURITY.md) para reportar uma vulnerabilidade.
