# Clean code e boas práticas — Oriens

Princípios que valem para backend e frontend. Os guias de [backend](backend.md) e [frontend](frontend.md)
trazem as regras específicas de cada camada; aqui ficam os fundamentos que guiam as decisões quando nenhuma
regra específica responde.

## 1. Simplicidade antes de tudo

Antes de escrever código novo, percorra esta ordem e pare na primeira opção que resolve **corretamente**:

1. O comportamento **já existe**? Reaproveite (ou não mude nada).
2. Existe uma **camada, tipo ou helper dono** desse assunto? Estenda ali
   (ex.: projeção nova → `WorkReadService`; query nova → `useWork.ts`; cor nova → token).
3. A **biblioteca padrão, o framework ou uma dependência já instalada** resolve? Use
   (Spring Data, Bean Validation, TanStack Query, Radix/shadcn, date-fns).
4. Uma **implementação pequena** cabe na arquitetura atual? Escreva no lugar onde a invariante pertence.
5. A estrutura atual **impede** uma solução clara? Faça a refatoração coerente que a tarefa exige — e só ela.

O objetivo é reduzir a complexidade **total do sistema**, não o número de linhas do diff. Uma mudança um
pouco maior, no lugar certo, é melhor que um remendo apertado, uma checagem duplicada ou lógica no lugar
errado.

### YAGNI — não construa o que ninguém pediu

❌ Interface com uma única implementação "para o futuro" (`XService` + `XServiceImpl`).
❌ Configuração para valor que nunca muda.
❌ Parâmetros, flags e pontos de extensão sem uso atual.
❌ Camadas genéricas (`BaseService<T>`, `GenericRepository`) para "padronizar".

Simplicidade **nunca** remove: validação na fronteira de confiança, autorização, tratamento de erro,
acessibilidade, proteção de concorrência, segurança de migração/rollback e testes exigidos.

## 2. Nomes

- O nome diz **o que é** ou **o que faz**, no vocabulário do domínio: `plannedDate`, `lockOwned`,
  `taskAffectsKey`. Evite `data`, `info`, `obj`, `tmp`, `handle2`, `doStuff`.
- Booleanos como pergunta: `isArchived`, `hasLabels`, `canEdit`, `reminderSent`.
- Funções com verbo: `createTask`, `formatMoney`; consultas descrevem o filtro: `findByIdAndUserId`.
- Mesmo conceito, mesmo nome nas duas pontas (`plannedDate` no Java, no JSON e no TypeScript).
- Abreviações só as consagradas (`id`, `url`, `dto`). Variáveis de uma letra só em lambdas curtas e índices.
- Código em inglês; textos para o usuário em pt-BR.

## 3. Funções e classes

- **Uma responsabilidade** por função. Se a descrição precisa de "e", provavelmente são duas.
- **Curta e em um nível de abstração**: orquestração chama passos nomeados; detalhes ficam nos passos.
- **Poucos parâmetros** (até ~3). Mais que isso → um `record`/objeto de comando (`CreateTask`, `TaskFilters`).
- **Retorno antecipado** (guard clauses) em vez de `if` aninhado.
- **Sem flag booleana** que muda o comportamento inteiro (`save(task, true)`): duas funções com nomes claros.
- **Funções puras** sempre que possível (`lib/`, cálculos de estatística): fáceis de testar e reusar.
- **Sem efeito colateral escondido**: um `get` não escreve; um `validate` não salva.
- **Uma instrução por linha** em código novo. Linhas que encadeiam várias declarações separadas por `;`
  economizam espaço mas custam leitura e diffs.

```java
// ❌ difícil de ler e de revisar
Long user = owner.id(auth); WorkHttp.agree(match, command.getVersion()); Task before = read.task(user, id);

// ✅
Long user = owner.id(auth);
WorkHttp.agree(match, command.getVersion());
Task before = read.task(user, id);
```

## 4. Comentários

- O código explica **o quê**; o comentário explica **por quê** (decisão, restrição, risco):
  `/** Bounded batch projection: one query per link type, never one query per task. */` é um bom exemplo.
- Não comente o óbvio (`// incrementa i`).
- Não deixe código comentado: o git guarda o histórico.
- `TODO` só com contexto e dono/issue: `// TODO(#123): remover rota após migração do app móvel`.
- Referências a spec são úteis quando a regra não é óbvia (`// SPEC §9.1`).

## 5. Erros

- **Falhe cedo e alto** na fronteira: valide entrada assim que ela chega.
- **Nunca engula exceção** (`catch {}` vazio, `return null` silencioso). Trate, converta para erro de domínio
  ou deixe subir.
- **Erro para o usuário** é acionável e em pt-BR; **erro para o log** tem contexto técnico, sem dado sensível.
- Não use exceção para controle de fluxo normal.
- Prefira tipos que tornam estado inválido impossível (enum em vez de string; `Optional` em vez de `null`
  no retorno de busca; união literal no TypeScript).

## 6. Duplicação e abstração

- **DRY vale para conhecimento, não para texto.** Duas regras de negócio iguais devem ter uma fonte só
  (ex.: rótulos de status em `lib/labels.ts`). Dois trechos parecidos por coincidência podem continuar
  separados.
- **Regra de três**: na terceira repetição, extraia. Antes disso, uma abstração errada custa mais que a
  duplicação.
- Prefira **consolidar** a criar um segundo jeito de fazer a mesma coisa. Se existe `WorkCombobox`, não crie
  `ProjectPicker` do zero.

## 7. Imutabilidade e estado

- Java: `record` para DTOs; campos `final`; coleções retornadas com `.toList()` (imutável).
- TypeScript: não mute props nem dados do cache do TanStack Query; crie novos objetos.
- Estado mínimo: tudo que pode ser derivado é calculado, não armazenado.

## 8. Testes

- Teste **comportamento**, não implementação. Um refactor que preserva o comportamento não deve quebrar teste.
- Estrutura **Arrange / Act / Assert**, um comportamento por teste, nome que descreve o cenário.
- Determinismo: relógio fixo (`Clock`, `vi.setSystemTime`), sem dependência de ordem nem de rede externa.
- Rode o **menor conjunto suficiente** para provar a mudança e reporte o que rodou.
- Sem teste "verde por omissão" (assert ausente, `catch` que esconde falha, `skip` esquecido).

## 9. Dependências

- Dependência nova precisa de motivo concreto: resolve algo que o stack atual não resolve, é mantida, tem
  licença compatível e custo de bundle/segurança aceitável. Registre o motivo no PR.
- Prefira o que já está instalado (o front já tem Radix, date-fns, recharts, zod, sonner…).
- Versões explícitas; atualização de major em PR próprio.

## 10. Git, commits e PRs

- **Conventional Commits** em inglês, imperativo, com escopo:
  `feat(tasks): add account-scoped labels`, `fix(mcp): …`, `refactor(layout): …`, `docs: …`, `test: …`.
- **Um assunto por commit/PR.** Refatoração separada de mudança de comportamento.
- PR pequeno o bastante para revisar com atenção; entregas grandes quebradas em fases (P0, P1…) com spec.
- Descrição do PR: o quê, por quê, como foi provado (comandos e resultados), riscos e o que ficou de fora.
- Nunca commitar segredos, artefatos de build, `test-results/` ou arquivos locais (`.env`, `*.local`).

## 11. Revisão de código — checklist

**Correção**
- [ ] Faz o que a tarefa pede, e só isso? Casos de borda (vazio, nulo, limite, fuso, concorrência)?

**Segurança**
- [ ] Toda leitura/escrita é escopada pelo dono? IDs vindos do cliente têm posse validada? (IDOR)
- [ ] Entrada validada na fronteira? Nada sensível em log ou resposta?

**Desempenho**
- [ ] Nenhuma consulta em laço (N+1), no back **e** no front? Listagens paginadas?

**Design**
- [ ] Está na camada dona do assunto? Reusa o que existe? Sem abstração especulativa?
- [ ] Frontend: shadcn em vez de HTML cru, tokens em vez de valores literais?

**Qualidade**
- [ ] Nomes claros, funções curtas, sem código morto, sem comentário óbvio?
- [ ] Testes cobrem o comportamento novo e o bug corrigido? Lint e testes passando?
