# Skills do Oriens

As regras de contribuição estão no [AGENTS.md](../../AGENTS.md). As skills
escolhem o método, as leituras e a evidência para cada trabalho.

## Carregamento

Inicie o agente na raiz do checkout e habilite a confiança do projeto quando
solicitada. Os arquivos canônicos estão em `.agents/skills/`.

| Agente | Descoberta | Invocação |
|---|---|---|
| Codex | Lê `.agents/skills/<nome>/SKILL.md` | Selecione a skill com `$nome` |
| Claude Code | Lê `.claude/skills/<nome>/SKILL.md` pelos links relativos versionados para o mesmo diretório | Use `/nome` |

Em sistemas que fazem checkout de links simbólicos como arquivos de texto,
habilite o suporte a symlinks para discovery automática ou peça explicitamente
a leitura de `.agents/skills/<nome>/SKILL.md`. Use uma sessão nova ao conferir
a descoberta. Para planejamento com persistência, conecte o
[MCP do Oriens](../mcp.md). Agent Reach e playwright-cli são ferramentas
opcionais do ambiente para seus fluxos; as adaptações versionadas carregam
sem instalação global das skills de origem.

[Skills no Codex](https://developers.openai.com/codex/skills/) ·
[Skills no Claude Code](https://code.claude.com/docs/en/skills)

## Quando usar

| Skill | Gatilho | Dispensa |
|---|---|---|
| [oriens-planejamento](../../.agents/skills/oriens-planejamento/SKILL.md) | Decompor demanda, revisar backlog ou registrar entregas | Trabalho já especificado sem mudança de escopo |
| [oriens-pesquisa](../../.agents/skills/oriens-pesquisa/SKILL.md) | Consultar fontes externas ou recuperar leitura pública incompleta | A resposta está nos guias e no código já lidos |
| [oriens-design-taste](../../.agents/skills/oriens-design-taste/SKILL.md) | Landing e páginas públicas | Tela de operação do app |
| [oriens-impeccable](../../.agents/skills/oriens-impeccable/SKILL.md) | Telas e componentes do produto | Página pública |
| [oriens-playwright](../../.agents/skills/oriens-playwright/SKILL.md) | Inspecionar mudança de UI ou investigar regressão visual | Mudança sem efeito observável na UI |
| [security-review](../../.agents/skills/security-review/SKILL.md) | Triagem de segurança em todo PR | Aprofundamento dispensado quando o impacto nulo estiver justificado |
| [code-review](../../.agents/skills/code-review/SKILL.md) | Revisão de correção em todo PR | Escopo da revisão acompanha o diff |

Escolha uma skill de design primária por superfície. Enquanto a #72 estiver
pendente, use o [guia de frontend](../conventions/frontend.md), os
[tokens](../conventions/frontend/design-tokens.md) e os
[componentes](../conventions/frontend/components.md). A
[regressão visual](visual-regression.md) tem os comandos e a rotina de baselines.

Antes de concluir um PR, use as duas skills de revisão e registre a evidência
no [fluxo de revisão](pull-request-review.md). No Claude Code, o comando
`/code-review` carrega a skill do projeto em uma instalação limpa.

## Origens

A referência para o fluxo foi o
[guia de agentes do FutspringV2](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/docs/agent-workflow.md)
e seu [AGENTS.md](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/AGENTS.md).
As adaptações são locais ao Oriens. Nas origens sem versão declarada, o SHA-256
identifica o `SKILL.md` de origem consultado.

| Adaptação | Origem consultada | Versão ou SHA-256 |
|---|---|---|
| Planejamento | `brainstorming-skill` | `9e3cf4b6ab0580e3c9f77bb2884fbf0ee52042d21d761af7e5f083eeff632c17` |
| Pesquisa | [Agent Reach](https://github.com/Panniantong/Agent-Reach) | 1.6.1 |

| Páginas públicas | `design-taste-frontend` (tasteskill v2) | `3435ed963b15a1b6447746ec8844ab2cd38d8d2e8ead3451937f42df01e408c4` |
| Produto | [Impeccable](https://github.com/pbakaus/impeccable) | 4.9.2 |
| Validação visual | [playwright-cli](https://github.com/microsoft/playwright-cli) e [validar-ui do FutspringV2](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/.claude/skills/validar-ui/SKILL.md) | CLI 0.1.25 e FutspringV2 no commit acima |
| Segurança | [Cloudflare security-audit](https://github.com/cloudflare/security-audit-skill/tree/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit) | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` |
| Revisão diferencial | [Trail of Bits differential-review](https://github.com/trailofbits/skills/tree/149d7b21f4067765b82e67029730b42d228ef4b4/plugins/differential-review/skills/differential-review) | `149d7b21f4067765b82e67029730b42d228ef4b4` |

A adaptação visual também consultou o [design system](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/client/docs/design-system.md),
os [testes do cliente](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/client/docs/testing.md)
e os jobs de [frontend](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/.github/workflows/ci-frontend.yml)
e [docs](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/.github/workflows/ci-docs.yml)
do FutspringV2.

Para os campos de PR, foram consultados o [fluxo de segurança](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/docs/SECURITY_REVIEW.md)
e o [template do FutspringV2](https://github.com/Guga2111/FutspringV2/blob/34b60e1cff5fe219ebec4bba079a67d39b568d37/.github/pull_request_template.md).

Consulte as [evidências das tarefas #106 a #110](../plans/2026-11-25-agent-skills-evidence.md).
