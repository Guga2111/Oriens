# Segurança do Oriens

## Reporte privado

Envie o relato para [contato@luisgosampaio.com](mailto:contato@luisgosampaio.com).
Inclua a versão ou SHA, a rota ou integração afetada, o impacto observado e
evidências sanitizadas com dados sintéticos. Mantenha detalhes sensíveis fora
de issues e PRs públicos. Remova credenciais e dados de terceiros do material.

## Regras transversais

- Resolva o dono pela identidade autenticada e filtre as consultas por dono.
  Valide os vínculos recebidos e devolva 404 para recursos de outra conta.
- Valide entradas na API e aplique as permissões da ação, incluindo papel
  administrativo ou escopo MCP, conforme a fronteira.
- Mantenha segredos fora do Git e omita credenciais e dados pessoais dos logs.
- Registre a triagem de segurança em todo PR e encaminhe achados sensíveis pelo
  canal privado. [Revisão de pull requests](docs/guides/pull-request-review.md)

| Fronteira | Guia vigente |
|---|---|
| Autenticação da SPA e JWT | [Sessão e JWT](docs/conventions/backend/security.md#sessão-e-jwt) |
| Posse, vínculos e 404 | [Autorização](docs/conventions/backend/security.md#autorização-e-idor) |
| Avatares, capas e anexos | [Uploads](docs/guides/security-uploads.md) |
| CORS e limites de taxa | [CORS e limites de taxa](docs/guides/security-browser-and-rate-limits.md) |
| Segredos e logs | [Segredos e logs](docs/guides/security-secrets-and-logs.md), [segurança do CI](docs/ci-security.md) |
| MCP, OAuth e escopos | [Contrato MCP](docs/conventions/backend/mcp.md), [operação](docs/guides/mcp-operations.md) |

O inventário de [dívida conhecida](docs/conventions/debt.md) registra pendências.
