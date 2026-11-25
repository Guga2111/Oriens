# Configuração e operação do MCP

Guia do operador. Consulte também o [contrato e os limites do MCP](../conventions/backend/mcp.md).

## Habilitar no Docker local

O Compose de desenvolvimento lê `.env` na raiz e repassa as opções MCP para
o Spring. O recurso continua desligado quando `ORIENS_MCP_ENABLED` não é definido.
A porta da API de desenvolvimento fica restrita a `127.0.0.1`.

No arquivo `.env`, preserve o `JWT_SECRET` existente e configure:

```dotenv
ORIENS_MCP_ENABLED=true
ORIENS_MCP_ISSUER=http://127.0.0.1:8080
ORIENS_MCP_FRONTEND=http://127.0.0.1:5173
ORIENS_MCP_ENCRYPTION_PASSWORD=<segredo aleatório estável com pelo menos 32 caracteres>
ORIENS_MCP_ENCRYPTION_SALT=<32 caracteres hexadecimais aleatórios>
ORIENS_MCP_CODEX_REDIRECTS=http://127.0.0.1/callback
ORIENS_MCP_CLAUDE_REDIRECTS=http://localhost:8765/callback
```

Guarde esse arquivo fora do Git, com permissão `600`. Gere os dois valores de
proteção uma vez e preserve-os entre reinícios; substituí-los exige o procedimento
de rotação do runbook. O schema MCP é criado pelo Flyway quando a API sobe.

Na raiz do repositório, recrie somente a API:

```sh
docker compose --env-file .env -f ops/compose/docker-compose.dev.yml up -d --no-deps oriens-api-dev
```

Se a imagem ainda não contém a implementação MCP, acrescente `--build` ao
comando. O banco e seu volume não precisam ser recriados.

No frontend, configure `apps/client/.env.development.local`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8080
```

Reinicie o Vite se necessário e abra **http://127.0.0.1:5173/config**. Faça login
novamente nessa origem. Use `127.0.0.1` tanto para frontend quanto para API;
misturar `localhost` e `127.0.0.1` impede a correlação OAuth por cookie. Não copie
o JWT entre origens. Em seguida, siga os passos de conexão abaixo. Habilitar o
servidor não concede permissões a nenhum cliente.

Para desligar, defina `ORIENS_MCP_ENABLED=false` e execute novamente o comando
Compose. As conexões/histórico persistidos são preservados.

## Instalação e rollback

O schema MCP são as migrações Flyway `V4__mcp_account`, `V5__mcp_work` e `V6__mcp_finance`,
aplicadas pela API no startup, em transação e com lock do Flyway. Um banco instalado pelos
antigos runners é adotado por `LegacySchemaSeal`: a revisão em `oriens_schema_baseline` vira o
baseline do Flyway e só as migrações seguintes rodam. Revisão desconhecida impede o startup.

Antes de publicar em banco real, identificar ambiente, host, banco e operador e fazer backup
com [backup e restore ensaiado em banco isolado](database-operations.md).

Rollback de aplicação preserva o schema aditivo. Desabilitar MCP e autorizações
antes de publicar código anterior. Não apagar conexões/histórico para reverter
código. Recuperação de banco ocorre em alvo novo/isolado, com troca coordenada;
nunca sobrescrever automaticamente o banco atual.

## Configuração

`ORIENS_MCP_ENABLED` é falso na ausência de configuração. Quando falso, as rotas
reservadas MCP/OAuth não caem na autenticação JWT genérica. API normal e login
continuam funcionando. Quando verdadeiro, issuer, frontend, chave/salt externos
e callbacks dos dois clientes são obrigatórios. Consulte `.env.example`.

- `ORIENS_MCP_ISSUER`: origem HTTPS pública da API, sem caminho/query/fragmento.
- `ORIENS_MCP_FRONTEND`: origem HTTPS confiável da interface. Os testes permitem
  explicitamente HTTP em `127.0.0.1`, com origens/portas distintas.
- `ORIENS_MCP_ENCRYPTION_PASSWORD`: segredo gerido externamente, mínimo 32 caracteres.
- `ORIENS_MCP_ENCRYPTION_SALT`: salt hexadecimal externo, mínimo 16 bytes.
- `ORIENS_MCP_CODEX_REDIRECTS`: callbacks exatos do registro `oriens-codex`.
- `ORIENS_MCP_CLAUDE_REDIRECTS`: callbacks exatos do registro `oriens-claude-code`.

Os registros públicos são configuração determinística, com IDs estáveis entre
instâncias, sem DCR, secrets ou autoaprovação. Novos clientes exigem registro e
callbacks próprios; setup desta fase aceita somente `codex` e `claude-code`.
Somente a porta de um callback IP loopback pode variar, pela validação nativa do
Spring. Host e caminho precisam corresponder ao registro; `localhost` usa URL exata.

O issuer/recurso não dependem de `Host` ou forwarded headers. No proxy real,
conferir os metadados por HTTPS e não registrar Authorization, corpos OAuth,
códigos, cookies ou query strings de callbacks. Diagnósticos do SDK que podem
incluir dados de entrada estão desligados; auditoria explícita registra metadados.

A ponte redireciona para `/config?mcpFlow=<id opaco>`. Ela não inclui o JWT e não
aprova nada automaticamente. A tela consulta e decide o fluxo
usando JWT no header e cookie de correlação.

## Operação e publicação

MCP permanece **desabilitado por padrão**.

Antes de habilitar um ambiente público:

1. Identifique host, banco e operador e confira o backup e o restore isolado. O
   Flyway aplica as migrações MCP V4–V6 com as demais no startup. O Hibernate
   confere o resultado com `ddl-auto=validate`.
2. Publique API e frontend compatíveis com versões/idempotência financeira antes
   de reabrir escritores. Não mantenha instâncias financeiras antigas em paralelo.
3. Configure issuer/recurso HTTPS, origem confiável de frontend e callbacks exatos.
   A ponte atual usa cookie HttpOnly Secure/SameSite Lax: frontend e API devem ser
   do **mesmo site**, com HTTPS em ambos (subdomínios distintos são permitidos).
   Origens completamente distintas não são cobertas por essa topologia. Não
   enfraqueça CSRF/CORS/cookie para contornar uma publicação incorreta.
4. Desabilite registro de query strings de OAuth/callback, cookies, Authorization
   e corpos com credenciais no proxy/APM. Sirva a SPA com fallback para `/config`
   e `/auth`. O frontend não deve ter analytics capturando esses fluxos.
5. Confira os metadados públicos pelo endereço HTTPS publicado. Execute os dois
   clientes, autorize uma leitura sintética, recuse acesso fora do recorte, reduza
   acesso e revogue. Confirme login normal, WhatsApp e estados nos três tamanhos.
6. Habilite o flag em todas as instâncias somente após o smoke. Observe erros,
   limites e correlação sem conteúdo de domínio. A evidência loopback não prova
   certificados, proxy ou DNS públicos.

Rollback: desabilite MCP/novas autorizações em todas as instâncias e preserve
schema aditivo, versões, recibos, tombstones e histórico. O login normal continua
disponível. Volte apenas para uma API/frontend compatível com as escritas
financeiras protegidas; um escritor que ignora versões não é um rollback seguro.
Restaurar banco exige alvo novo/isolado e troca coordenada conforme o runbook.
O teste P4 verifica desligar/religar em instâncias independentes com o mesmo
PostgreSQL descartável e sem perda da autorização persistida.

## Rotação da chave de proteção

A rotação inicial invalida conexões existentes e exige nova autorização, em vez
de prometer recriptografia online não implementada. Procedimento do operador,
com alvo literal, manutenção, escritores parados e backup/restore conferido:

1. Desabilitar MCP/novas autorizações em todas as instâncias.
2. Em transação, travar conexões em ordem de ID; registrar um evento `key_rotation`
   por conexão ainda não revogada; marcar revogação, incrementar `version` e
   `policy_revision`; encerrar os fluxos temporários. Não apagar histórico.
3. Provisionar nova chave/salt no secret manager em todas as instâncias. Preservar
   a chave antiga somente sob a política de recuperação dos backups.
4. Subir o mesmo código, verificar que tokens anteriores falham e novos fluxos
   funcionam, e só então retomar conforme os gates de liberação. Autorizações
   antigas permanecem revogadas e expiram pela limpeza normal.

Não trocar a chave de somente uma instância. Não habilitar novamente grants
revogados. A execução desse procedimento em ambiente compartilhado precisa de
aprovação operacional explícita.
