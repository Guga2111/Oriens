# Revisão de pull requests

Use [security-review](../../.agents/skills/security-review/SKILL.md) e
[code-review](../../.agents/skills/code-review/SKILL.md) em todo PR, inclusive
documentação, dependências e release. A revisão de segurança sempre faz triagem.
Quando o diff preserva as fronteiras, basta justificar o impacto nulo. Se o
impacto persistir ou for incerto, siga as fronteiras e os chamadores afetados.
Os [checks de CI](../ci-security.md) são evidência complementar. Consulte a
[política de merge](merge-policy.md) para os checks previstos em `dev` e `main`.

## Fixar o diff

Obtenha o SHA atual do destino e o SHA proposto pelo PR. Use o ancestral
comum como início do diff que introduz o trabalho.

```sh
git merge-base <sha-destino> <sha-head>
git diff --stat <sha-merge-base> <sha-head>
git diff <sha-merge-base> <sha-head>
```

Revise a árvore proposta. Use `git show <sha>:<caminho>` para ler o código
na revisão correta. Identifique trabalho local ainda sem commit quando ele
fizer parte da análise. Antes do merge, confira novamente destino e head.
Com mudança relevante em qualquer lado, reavalie o diff e repita as verificações
afetadas. Um release revisa todo o intervalo contra seu próprio destino.

## Campos do PR

Preencha o [template](../../.github/pull_request_template.md) na descrição do PR.
O GitHub preenche o formulário quando o arquivo está na branch padrão (`main`).
Até chegar a `main`, use o arquivo como modelo ao abrir o PR.

- **Comportamento e escopo** com contexto, resultado esperado e tarefa.
- **Revisões realizadas** com SHA do destino, merge-base, head e revisão das
  skills (commit do repositório). Indique impacto de segurança e motivo,
  fluxos cobertos e a recomendação de cada revisão.
- **Achados e resolução** com gravidade, caminho e linha, impacto, correção
  e evidência. Registre validações pendentes, riscos e referências restritas
  quando aplicável. Use um resumo sanitizado no PR.
- **Validação** com comandos realmente executados, resultados, lacunas e
  capturas quando a UI mudar. Inclua o motivo da dispensa de testes aplicáveis.
- **Migração, configuração e rollback** quando relevantes, com links aos
  guias afetados. Use o [AGENTS.md](../../AGENTS.md) para a verificação da área.

Mantenha credenciais, dados pessoais e detalhes sensíveis fora do resumo.
Encaminhe evidência restrita pelo canal autorizado. Trate um achado confirmado
no escopo antes de recomendar merge e registre a revalidação da correção.

No [PR #19](https://github.com/Guga2111/Oriens/pull/19), a descrição delimita
uma mudança de documentação e o defeito que ela registra. Para um PR assim,
registre também os SHAs, as duas revisões e a validação documental executada.
No [PR de release #51](https://github.com/Guga2111/Oriens/pull/51), os checks
passaram e a revisão registrou um bloqueio de integridade ao restaurar a API
anterior sobre o banco migrado. Use a seção de rollback para explicitar essa
compatibilidade e a evidência que falta para autorizar a promoção.
