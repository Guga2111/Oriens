# P4 — revisão visual

Skill: `design-taste-frontend`, modo app, seguindo §7.3 da SPEC. Extensão da
interface existente, sem sorteio, seed ou redraw: Inter, tokens creme/bordô,
shell, PageHeader, SettingsSection/SettingRow e diálogos do Oriens preservados.

Pergunta: **quais clientes podem acessar meus dados e com quais permissões?**
Elemento próprio: projetos nomeados + tarefas avulsas + ações financeiras
independentes, reunidos num resumo que usa a mesma seleção do formulário.

## ROUND 1 — antes

Seen in one second: configurações pessoais, com Aparência primeiro.
Idea (one sentence): os serviços da conta aparecem como linhas de configuração.
Live thing: tema/notificações existentes; ainda não havia acesso MCP.
Layout words by section: aparência=linha / notificações=linhas / integrações=linha / conta=linhas.
Scores: design 7 · usability 7 · creativity 6 · content 6 → overall 6.7.
Caps applied: nenhuma regra de imagens/movimento de landing page se aplica a app.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `before/inspect/mobile-fold.jpg`: descrição e estado WhatsApp disputavam uma
   linha estreita. SettingRow passa a uma coluna no telefone, preservando desktop.
2. `before/inspect/desktop-page-01.jpg`: Integrações não respondia quem tinha
   acesso MCP. Acrescentados lista real, estado e resumo de recortes, sem KPIs.
3. Não havia consentimento/gestão para revisar visualmente. Construídos os estados,
   o resumo completo e os diálogos; no gate final, botões/campos de toque têm 44 px.

Antes: 0 FAIL, 2 WARN. `hero-void` (30%) e bordas dos painéis (1,45:1), nos
tokens/layout já existentes. Capturas abertas: fold e folha de cada viewport.

## ROUND 2 — final

Seen in one second: Configurações; no consentimento, cliente/conta e autorização.
Idea (one sentence): a combinação específica de projetos, avulsas e finanças
vira um resumo legível do acesso que será concedido ao cliente.
Live thing: a seleção atualiza o resumo, e o salvar aplica uma redução versionada.
Layout words by section: integrações=lista / setup=seletor+configuração / consentimento=grupos+resumo / gestão=resumo+formulário+histórico.
Scores: design 7 · usability 8 · creativity 6 · content 8 → overall 7.2.
Caps applied: nenhuma falha de medição. A solução deliberadamente segue a
linguagem de configurações existente, sem introduzir uma identidade nova.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `live/inspect/mobile-page-01.jpg`: MCP fica depois de Aparência e Notificações.
   Mantida a ordem de Configurações; reorganizar toda a página foge da extensão
   aprovada. A ação permanece no cabeçalho do bloco de integrações.
2. `live/inspect/desktop-fold.jpg`: os painéis existentes mantêm bordas 1,45:1.
   Preservadas para consistência com o sistema; não foi alterado o token global.
3. `live/inspect-consent/mobile-page-01.jpg`: o consentimento exige rolar para ler
   todas as ações. Mantidos grupos explícitos e resumo completo, com exclusões
   e renovação desmarcadas; não foram ocultadas permissões para reduzir a altura.

As sete perguntas do modo app:

1. O formulário domina o consentimento; cliente/conta aparecem primeiro. Na
   gestão, o resumo precede edição e histórico. Não há figura decorativa maior.
2. Bordas/margens fecham no mesmo eixo; telefone usa uma coluna, sem overflow.
   Diálogos rolam por dentro e mantêm o contexto/título.
3. A marca continua no shell. Bordô identifica ação/seleção; não há gráficos,
   ícones em caixas coloridas, sombras de painéis ou gradientes novos.
4. Não há KPIs. Projetos e ações do resumo derivam da mesma seleção; estado e
   datas derivam da conexão; contagem/página do histórico vêm da resposta filtrada.
5. Ausência aparece como “Nenhum”, “Sem acesso” ou “Ainda não utilizada”, sem
   heartbeat ou último uso inventado. Expirada/revogada são estados escritos.
6. Sem gráficos/legendas. Eventos distinguem resultado por palavras; detalhes de
   correlação/recursos ficam em disclosure acessível.
7. Sidebar recolhida, labels legíveis e foco visível. A prova mede controles de
   44 px, percorre foco com Tab/Enter, usa toque emulado e verifica retorno do foco.

## Medições finais

| Tela | 1440 / 768 / 390 px | Avisos |
| --- | --- | --- |
| Configurações antes | 0 FAIL | 2: vazio detectado no layout existente e bordas |
| Configurações final | 0 FAIL | 2: os mesmos tipos; vazio medido cai de 30% para 28% |
| Consentimento final | 0 FAIL | 0 |
| Lint de fonte P4 | 0 FAIL | 0 |

Exceções `palette-cream` e `edge-text`: preservam a marca e a geometria da shell
existente, conforme a SPEC; nenhuma UI MCP foi escondida do inspector. O
inspector tem uma verificação positiva do volume do formulário de consentimento
para impedir aprovar capturas de uma página de erro/login por engano.

Foram abertas as doze capturas finais listadas pelos dois inspectors: fold e
folha de desktop/tablet/mobile, tanto de Configurações quanto de consentimento.
Também foram revisados setup, gestão, histórico, conflito e estados por tamanho
nas capturas do runner de produção. Diálogos e toasts têm animações existentes;
quadros isolados capturados durante abertura não são usados como medição da página.

Não há fotos, vídeos ou desenhos novos, nem conteúdo de amostra na interface
publicada. As contas/projetos/eventos sintéticos existem exclusivamente nos
fixtures e no PostgreSQL descartável. Não há créditos de mídia a inserir.
