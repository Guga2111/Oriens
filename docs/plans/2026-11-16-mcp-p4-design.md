# P4 — experiência de conexões MCP

Implementação do desenho já aprovado na SPEC, seções 6–8, 13 e 16. Não muda
login, shell, stack, identidade visual ou concessões. As alterações P2/P3 presentes
no working tree são pré-requisitos e serão preservadas.

## Comportamento e invariantes

- Configurações reutiliza `SettingsSection`, `SettingRow`, temas e diálogos atuais.
- Setup copia configuração pública do ambiente; não cria conexão nem credencial.
- Consentimento usa somente fluxo UUID, JWT no header e cookie HttpOnly existente.
- Retomada aceita exclusivamente `/config?mcpFlow=<UUID>`; sem destino livre.
- Só contexto mínimo começa marcado; dependências nunca acrescentam escopo não solicitado.
- Projetos existentes (inclusive arquivados), avulsas e finanças são recortes distintos.
- Redução usa versão capturada; conflito mantém rascunho e exige recarga explícita.
- Ampliação orienta nova autorização; a conexão anterior não é mesclada ou ampliada.
- Revogação nomeia a conexão e conserva operações concluídas e histórico.
- Histórico pagina e filtra metadados reais; nenhum conteúdo privado ou segredo.

## Aplicação de design-taste-frontend

Extensão de componentes de uma tela existente: sem sorteio, conforme §7.3 da SPEC
e o caso especial da skill. Preservar Inter e tokens creme/bordô do Oriens; permitir
`palette-cream` na inspeção por ser marca existente. Sem imagens, dados decorativos,
KPIs ou animações de entrada. Feedback segue componentes existentes.

Pergunta: quais clientes podem acessar meus dados e com quais permissões?
Elemento próprio: resumo legível de projetos nomeados + avulsas + ações financeiras.
Lista de conexões precede instruções secundárias; ações principais são conectar,
autorizar ou salvar, uma por contexto.

Inventário: conta autenticada; cliente registrado; nome atribuído; estado vigente;
autorização/expiração; último uso real; projetos selecionados; avulsas; ações por
domínio; renovação opcional por 30 dias; eventos com resultado/data/correlação.
Conta nova tem lista vazia, sem números inventados. Fixtures são sintéticos e
pertencem exclusivamente às provas, nunca à interface publicada.

Alternativas consideradas: nova página/shell (duplicaria configurações); editor
que amplia grants (viola OAuth); extensão da seção e ponte existentes (adotada).

## Prova

Antes/depois no build de produção a 1440/768/390; inspeção da skill e revisão de
todas as capturas. Testes de dependências, subconjuntos solicitados, versão,
rascunho/conflito, cancelamento, retomada local, histórico e setup. Navegador real
com API/PostgreSQL descartáveis; clientes reais sem inferência externa; smoke de
publicação e rollback em ambiente isolado. Registrar falhas ou gates não provados.
