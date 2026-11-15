# Sequência de atividade — desenho aprovado

Aprovado pelo usuário: atividade = tarefa concluída ou hábito executado; opção 1,
indicador compacto no resumo com chama vermelha. Não criar card de recorde.

- Um dia com uma ou várias realizações contribui uma vez. Financeiro não entra.
- Dias consecutivos de calendário, inclusive fins de semana, em America/Recife.
- Hoje ativo estende a sequência; hoje ainda sem atividade preserva a sequência
  encerrada ontem até a próxima virada de dia. Dias anteriores sem atividade quebram.
- Não é sequência de um hábito: pausas/dias não programados continuam excluídos
  da aderência do hábito, mas não dispensam um dia da sequência global de atividade.
- Independente do período global e da navegação anual. Calcular na API sobre o
  histórico existente inteiro, sem limite artificial de 366 dias ou nova migração.
- Reabrir/excluir tarefa ou desmarcar execução recalcula; múltiplas realizações
  no mesmo dia não duplicam o dia. A programação de hábitos é prospectiva e a API
  só aceita execuções válidas, preservando esse histórico.
- Se a sequência toca/atravessa a borda de cobertura confiável, mostrar
  “Pelo menos N dias seguidos”. Não inferir inatividade em lacunas antigas.
  Quando nem ontem tem cobertura suficiente para afirmar zero, mostrar “—”.
- Loading via Skeleton; erro inicial indisponível com tentativa; atualização com
  erro preserva a última contagem, explicitamente marcada. Zero tem texto próprio.
- Compor Badge/Popover/Button locais; Flame de lucide-react, sem emoji, pulso ou
  gradiente. Vermelho é token semântico próprio da sequência, distinto de erro;
  contraste nos dois temas. Explicação acessível por teclado, toque e mouse.
- Cache por usuário/dia, invalidado por tarefa e hábito; nenhuma invalidação por
  financeiro, nem request por célula. Virada de dia usa o hook de data do produto.

Alternativas avaliadas: indicador compacto (reutiliza resumo, menor custo e densidade)
e card de sequência atual/recorde (mais destaque, mais métricas/espaço). Aprovada
primeira. Manter direção achromatic-ledger, Inter e paleta Oriens; vermelho localizado
é exceção estética explicitamente solicitada pelo usuário.

Provas: dias consecutivos/múltiplos, hoje pendente/ativo, quebra na virada Recife,
fins de semana, fonte combinada, reabertura/desmarcação, cobertura parcial/ausente,
mais de 366 dias, isolamento e invalidação; build e navegador em três larguras e
ambos os temas, usando banco descartável.
