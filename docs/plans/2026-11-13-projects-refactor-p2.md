# Projetos — entrega P2

Etapa **API e segurança**, sobre o domínio/persistência P1. Não é liberação do
produto: P3–P6 continuam pendentes, assim como o checkpoint operacional da baseline.
Não houve deploy, reset, migração de registros nem acesso a banco compartilhado.

## Implementação e contratos

`ProjectController` e `TaskController` delegam as escritas a `ProjectWorkService`.
O adaptador HTTP mantém uma transação até construir os DTOs e seus metadados;
as regras, locks, versões, detach e estados permanecem no serviço de domínio.
Nenhuma entidade Project/Task/User é serializada nas rotas afetadas.

- `WorkOwner` resolve o usuário pelo principal JWT e valida o `userId` da URL.
  ADMIN recebe o mesmo escopo pessoal. Leituras individuais, listas, sidebar,
  preview, upload, resumo semanal e estatísticas passam por esse escopo.
- PATCH de metadados, modo, favorito e arquivamento usa estado explícito e versão.
  Objetivos usam IDs; colunas, ordem completa, padrões e remoção usam a versão
  estrutural. Criação de objetivo também exige projectVersion, conforme P0.
- Tarefa usa um único PATCH para conteúdo, datas, estado, movimento e transferência.
  Toda edição de tarefa já vinculada exige a projeção projectVersion, inclusive
  conteúdo/datas; transferência valida também targetProjectVersion.
- GET individual e respostas versionadas emitem ETag forte. DELETE de projeto usa
  a versão do preview; DELETE de tarefa/objetivo usa If-Match e X-Project-Version
  quando vinculado. If-Match opcional em PATCH precisa concordar com o corpo.
- Respostas seguem os envelopes de P0 para tarefa, objetivo e configuração de quadro;
  incluem versões estruturais, IDs de projetos afetados, datas anterior/nova e
  contagens de desvinculação/movimento. Remoção de coluna invalida o quadro inteiro.
- PUT integral, rotas singulares de objetivos por índice, unarchive e os antigos
  favorito/archive sem corpo retornam 410 sem executar a escrita antiga.
- Parsing estrito, restrito aos controladores afetados, rejeita campos desconhecidos,
  números fracionários para inteiros, coerção de strings, ordinais de enums, chaves
  JSON duplicadas, datas impossíveis e datas/horas fora de YYYY-MM-DD/HH:mm:ss.
  PATCH continua distinguindo ausência e null. Paginação limita size a 100 e
  ordenação a campos permitidos; não aceita propriedades arbitrárias do modelo.
- Erros usam `{code,message,fieldErrors,requestId}`, códigos P0 e mensagens seguras.
  Sessão ausente/inválida recebe 401, recurso alheio 404, conflito 409 e precondição
  ausente 428. Falhas internas não retornam stack trace ou detalhes do banco;
  requestId correlaciona o erro com o log. CORS expõe ETag e X-Request-Id.
- Upload mantém diretório e URL existentes, valida proprietário antes de gravar,
  exige If-Match, limita imagem a 5 MB e extensões JPG/PNG/GIF/WebP. Falha da escrita
  versionada remove o arquivo recém-criado; não há substituição integral do projeto.

`WorkReadService` fornece projeções autorizadas para essas operações. As leituras
existentes de dia/range/listagem foram protegidas e passaram a DTOs, mas **ainda
usam as consultas antigas de prazo**. DayResponse, range por planejamento,
planning-count, board filtrado, summary de projetos, consultas em lote, jobs e
estatísticas com as novas datas são a P3. Não se deve consumir esta etapa como
implementação completa das leituras v2, nem publicar o frontend atual contra ela.

## Idempotência e retenção

`WorkCreationService` grava recibo e recurso na mesma transação, para todas as
criações de entidade. Chave UUID é obrigatória e escopada por usuário/operação,
com o ID do pai na operação de objetivo/coluna. O SHA-256 usa campos ordenados
recursivamente, títulos normalizados e defaults equivalentes.

Um lock da linha do próprio usuário serializa as criações antes dos locks de
projeto. Assim, duas primeiras utilizações simultâneas da mesma chave observam
um único recibo, sem exceção de unicidade seguida de transação abortada. Essa
serialização de criações por usuário é intencional para a carga pessoal do MVP;
não adiciona fila, dependência nem serviço externo.

Replay devolve corpo/ETag originais, após autenticação e verificação de existência,
antes de validar novamente uma versão estrutural que a criação já incrementou.
Payload diferente retorna 409. Recurso removido ou tentativa expirada retorna
410, sem recriar. Falha da criação reverte também o recibo.

TTL de replay é 24 horas. O job horário elimina o corpo de resposta expirado,
retendo uma marca mínima (dono/operação/chave/hash/ID/versão/datas/status) para não
transformar retry incerto em nova criação depois da limpeza. As marcas não têm
FK para o recurso e não armazenam autenticação. A baseline SQL permanece intacta.

## Prova

Comandos, a partir de `oriens-api`:

```bash
python3 ops/projects-refactor/test_p2.py
python3 ops/projects-refactor/test_p1.py
mvn -q -o test
```

A prova P2 usa PostgreSQL 15 descartável, banco `oriens_p2_proof`, porta efêmera
restrita a localhost e fixtures sintéticas. Aplica a baseline com o runner P0,
usa `ddl-auto=validate`, verifica o selo do catálogo após as operações e remove
o container em `finally`. Só habilita a suíte com URL de loopback e nome de banco
explícitos. O contexto MVC importa o filtro JWT real e os serviços JPA reais;
os mocks ficam nos serviços externos/legados que não participam das novas escritas.

A suíte P2 cobre, em oito testes com múltiplas requisições:

1. Sessão ausente/inválida, dois proprietários ADMIN, leituras/listas/estatísticas,
   edição/exclusão, vínculos, objetivos, colunas, padrões e upload sem acesso cruzado.
2. ETag, conclusão em Recife, repetição sem trocar completedAt, conflito, versão
   estrutural obrigatória, reabertura, remoção de planejamento e movimento ON_DOING.
3. Replay com defaults/trim/ordem de campos equivalentes, chave incompatível,
   recurso excluído, expiração/limpeza e duas criações simultâneas com a mesma chave.
4. Escritas antigas, versão/chave ausentes ou inválidas, headers divergentes,
   campos desconhecidos, coerções, datas/horas inválidas e JSON duplicado.
5. Objetivo sem toggle, replay, conversão repetida, exclusão de objetivo preservando
   tarefa, preview obsoleto e exclusão de projeto preservando identidade/estado/datas.
6. Configuração de colunas com versões, replay, rejeição de kind ocupado,
   renomeação/reordenação e remoção com destino/padrão na mesma transação.
7. Exclusão concorrente à criação de tarefa, serializada pelo lock do projeto,
   sem tarefa órfã nem escrita parcial.
8. Falha após inserir o projeto, rollback de estrutura/recibo e nova tentativa válida.

A regressão P1 mantém os 13 testes PostgreSQL de invariantes, FKs, rollback,
ordenação, transferência e locks. Seu helper de PATCH agora fornece a versão
estrutural nas edições vinculadas, conforme o contrato já fixado na SPEC/P0.

A suíte Maven geral continua com os dois erros preexistentes documentados na P1:
`OriensApiApplicationTests.contextLoads` sem `file.upload-project-dir` e
`UserServiceImplTest.whenSaveUser_withNewEmail_thenShouldReturnSavedUser` sem mock
de `ApplicationEventPublisher`. Os demais 40 testes comuns passaram; as provas
PostgreSQL são opt-in e ficam desabilitadas nesse comando. A primeira tentativa
sob sandbox também encontrou bloqueio de instrumentação Mockito; a repetição com
acesso de execução adequado confirmou somente os dois erros acima.

Compilação Java/testes, parsing Python dos runners e `git diff --check` também
fazem parte da verificação. Sem dependências adicionadas.

## Visual e próximos incrementos

A skill design-taste-frontend foi aplicada ao escopo: P2 não altera interface.
Mantidos Horizonte e a direção anterior `editorial-greeting`, seed 275775847,
com `keep palette,type`. Não houve novo draw, imagens, animações, lint visual,
inspeção de navegador ou pontuação de screenshots. Essas provas pertencem a P4–P6.
