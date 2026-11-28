# Oriens

Gestão pessoal de tarefas, projetos, hábitos, estatísticas e finanças, com integração MCP.

- [API](apps/api/) em Java 25, Spring Boot 4.2 e PostgreSQL 15.
- [Cliente](apps/client/README.md) em React, TypeScript e Vite.

## Primeiros passos

Na raiz, liste os comandos disponíveis.

```sh
make help
```

Para iniciar o ambiente local, prepare as ferramentas e o `.env` conforme o
[guia de setup](docs/guides/setup.md). Depois, execute os comandos na raiz.

```sh
npm --prefix apps/client ci
make dev
```

Abra [o cliente local](http://localhost:5173). Use Ctrl+C para parar o Vite e
`docker compose -f ops/compose/docker-compose.dev.yml stop` para parar a API e
o PostgreSQL.

Siga o [índice da documentação](docs/README.md) e o
[AGENTS.md](AGENTS.md) para contribuir. Use a
[política de segurança](SECURITY.md) para reportar uma vulnerabilidade.
