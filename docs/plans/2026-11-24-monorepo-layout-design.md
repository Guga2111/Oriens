# Layout do monorepo

Plano da tarefa #102 do Oriens. A divisão segue a referência de
[estrutura do FutspringV2](https://github.com/Guga2111/FutspringV2/blob/da7132b99725be26ebd73b0c60495f588cfcdeee/README.md).

| Origem | Destino | Consumidores |
|---|---|---|
| `oriens-api/` | `apps/api/` | Maven e wrappers, Docker, Actions, Dependabot, CodeQL e provas Java |
| `oriens-front/` | `apps/client/` | npm, Vite, TypeScript, shadcn, Playwright, Actions e provas de navegador |
| Três arquivos Compose | `ops/compose/` | Inicialização local, workflow de deploy e referência legada ECR |
| `oriens-api/ops/` | `ops/` para runbooks e inventário, `scripts/` para executáveis | CI, provas de integração/MCP e rotinas de banco |
| `oriens-front/docs/` | `docs/client/` | Evidências do cliente e links de documentação |

1. Mover os diretórios e atualizar no mesmo commit todos os consumidores e links
   ativos. Aliases internos continuam relativos à aplicação.
2. Comparar o conteúdo das migrações Flyway e a configuração efetiva do Compose.
   Manter a imagem, a rede, os volumes, a porta e o nome do arquivo no VPS.
3. Validar em checkout limpo as suítes API e PostgreSQL, lint, testes e build do
   cliente, Compose, imagem e smoke do deploy em ambiente isolado.
4. Abrir o draft #102 contra `dev`. Empilhar os guias e o check (#103–#104),
   depois a extração do deploy (#105).

Para reverter antes do merge, descarte a proposta de layout. Após o merge, reverta o
commit do layout junto com os consumidores. Se as etapas seguintes já estiverem
integradas, reverta-as em ordem inversa primeiro. O retorno ao layout anterior
usa as mesmas migrações e os mesmos volumes. Para retornar a aplicação no VPS,
use a imagem anterior e a distribuição correspondente do cliente.
