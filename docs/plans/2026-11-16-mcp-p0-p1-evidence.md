# MCP — evidência de implementação P0/P1

Data: 2026-11-16. Base: `e4efeb2`; desenho de execução registrado em `cdd7186`.
Contrato: [SPEC](2026-11-16-mcp-account-spec.md).
Operação e reprodução: [README P0/P1](../../ops/mcp-account/README.md).

[Resultados estruturados, sem credenciais](2026-11-16-mcp-p0-p1-evidence.json).

## Dependências e decisões comprovadas

| Componente | Versão efetiva |
| --- | --- |
| Java de compatibilidade | Temurin 17.0.15, imagem `maven:3.9.9-eclipse-temurin-17` |
| Java local adicional | OpenJDK 25.0.2, compilação release 17 |
| Spring Boot | 3.5.6, preservado |
| Spring Authorization Server | 1.5.2, gerido pelo Boot |
| SDK/transporte/JSON MCP | `mcp`, `mcp-core`, `mcp-spring-webmvc`, `mcp-json-jackson2` 0.18.3 |
| PostgreSQL isolado | 15.19, `postgres:15-alpine` |
| Codex efetivamente testado | `codex-cli 0.167.1` |
| Claude Code efetivamente testado | `2.1.325` |

Estas são as menores versões de clientes efetivamente testadas nesta entrega;
não se promete compatibilidade com versões anteriores. SDK e Spring AI não são
sinônimos: foi usado diretamente o SDK WebMVC, com ferramentas registradas
explicitamente, sem instalar starter/modelos ou migrar a stack. A negociação MCP
é do SDK; o teste de protocolo inclui initialize solicitando `2025-06-18`.

A limitação de refresh público do Spring foi resolvida por extensões suportadas:
gerador OAuth de refresh, converter/provider de identificação de cliente público
somente nos endpoints de refresh/revogação e wrapper transacional dos providers
nativos. O Spring continua validando PKCE/código/cliente/retorno e executando os
grants. O repositório implementa a SPI `OAuth2AuthorizationService`; não há
servidor OAuth ou JSON-RPC próprio, nem criptografia própria.

## P0 — prova isolada

- Ambos os clientes reais completaram OAuth público com PKCE, inicialização,
  descoberta e chamada de `oriens_get_context`. Nenhum JWT da conta foi passado
  a eles. Codex usa seu protocolo app-server sem iniciar turno de modelo.
- Claude Code recebeu um fixture Messages determinístico por loopback para
  provocar a chamada da ferramenta. Não houve inferência nem mensagens externas.
- Codex usou `oriens-codex`, callback `http://127.0.0.1:<porta>/callback` e issuer
  na resposta. Claude usou `oriens-claude-code` e callback exato
  `http://localhost:8765/callback`. Host/caminho adulterados foram recusados.
- Browser real com duas origens loopback comprovou CORS, cookie de correlação
  HttpOnly/SameSite Lax, JWT somente no header, decisão e troca de código com PKCE.
  O JWT sozinho não assume fluxo iniciado em outro navegador. Cookie sozinho
  também não autentica. O fixture não é a interface de produto da P4.
- Refresh público rotaciona, não amplia escopos e detecta replay. Corrida de dois
  refreshes tem um sucesso e uma recusa, com família revogada por reutilização.
- Expiração de access token e prazo absoluto foram forçados no estado sintético
  e recusados. Configurações nativas fixam código em 60 s, access em 15 min e
  família em 30 dias. Não se aguardaram trinta dias de relógio.
- Instâncias Spring independentes releram tokens criptografados; revogação por
  uma foi observada pela outra e continuou inválida após reinício real.
- Login `/authenticate` permaneceu funcional. JWT normal em MCP e token MCP em
  gestão REST foram recusados. Desabilitar MCP não exige suas chaves/configuração
  e não deixa rotas reservadas caírem na cadeia JWT genérica.

## P1 — invariantes e persistência

A evolução aditiva instala conexões/escopos/allowlist, autorizações e lookup
criptográfico, fluxos, auditoria e contadores. FKs compostas recusam projetos de
outro dono; associação ao projeto é removida por exclusão sem bloquear o domínio.
Conta excluída remove também suas conexões e credenciais.

Testes PostgreSQL provaram instalação/repetição, recusa de drift, rollback total
por falha deliberada, selo final, isolamento por dono, negação por padrão,
dependências de escopos, precondições, redução imediata, recusa de ampliação e
conflito de versão. Renomear não altera `policyRevision`. Revogar repetidamente
confirma o estado final. Chamadas autorizadas e revogação se serializam.

Auditoria e operação confirmam juntas; falha deliberada de auditoria reverte a
operação e não devolve dados novos. Erros de ferramenta são sanitizados. Lookup
não contém bearer recuperável; valores persistidos criptografados foram
verificados sem access/refresh/JWT em claro. Contadores são duráveis e atômicos.
Schemas de gestão recusam propriedades extras, duplicadas, coerção e null inválido.

## Escopo entregue e limites

P0/P1 fornecem infraestrutura, gestão REST e uma única ferramenta inofensiva.
Projetos/tarefas/objetivos são P2; finanças/versão financeira são P3; interface,
setup completo para outros clientes e liberação são P4. O frontend de produto
não foi redesenhado: `design-taste-frontend` foi aplicado para manter essa divisão,
preservar o design existente e não substituir consentimento por uma tela fictícia.
Não há alegação de inspeção visual de produção nesta fase.

MCP permanece desabilitado por padrão. Nenhuma migração foi aplicada em banco
compartilhado, nenhum cliente pessoal foi reconfigurado e não houve deployment.
HTTPS, proxy, origins públicos e smoke de publicação precisam ser conferidos no
ambiente de liberação da P4; evidência loopback não prova essa infraestrutura.
A rotação de proteção inicialmente encerra grants e exige novas autorizações;
o procedimento e seu custo estão documentados. Outros clientes ainda precisam
de registro explícito e não recebem o ID de outro software silenciosamente.

## Referências oficiais consultadas

- [Spring Authorization Server: PKCE e refresh público](https://docs.spring.io/spring-authorization-server/reference/guides/how-to-pkce.html).
- [Spring: componentes e SPIs de autorização](https://docs.spring.io/spring-authorization-server/reference/core-model-components.html).
- [Spring AI 1.1: transporte stateless WebMVC](https://docs.spring.io/spring-ai/reference/1.1/api/mcp/mcp-stateless-server-boot-starter-docs.html).
- [OpenAI: MCP no Codex, clientes registrados e callbacks](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
- [Claude Code: MCP e autenticação](https://code.claude.com/docs/en/mcp).

## Resultado das verificações finais

- Java 17: 19 testes de backend executados, zero falhas/erros; os dois testes
  opcionais de CLI/navegador foram executados separadamente no host.
- Clientes reais e navegador: provas aprovadas, com artefatos estruturados.
- Regressões existentes: 25 testes de API/domínio aprovados; três casos opcionais
  de navegador das telas antigas não foram executados, pois essas telas não mudaram.
- Checksum da migração e `git diff --check`: conferidos.
