# Hábitos flexíveis (N vezes por semana) — desenho

Data: 2026-11-19 · Branch: `feat/flexible-habits`

## Problema

Todo hábito era programado em dias fixos da semana (`habit_schedules.weekdays`). Quem treina 5x por
semana sem dias fixos precisava escolher 5 dias arbitrários: treinar em outro dia não podia ser
registrado, e o dia escolhido que ficou sem treino virava "Não realizado" nas estatísticas.

## Decisão

Uma programação passa a ter **uma** de duas frequências:

| Frequência | Armazenamento | Expectativa |
|---|---|---|
| Dias fixos (atual) | `weekdays` = máscara, `weekly_target` = `NULL` | uma execução em cada dia programado |
| Vezes por semana (nova) | `weekdays` = 127 (todos), `weekly_target` = 1–7 | N execuções por semana ISO (seg–dom), em qualquer dia |

Migração `V7__flexible_habits.sql`, aditiva: coluna nula + `CHECK` garantindo que a meta semanal só
existe com todos os dias elegíveis. Hábitos existentes não mudam de comportamento.

### Estados de um dia com meta semanal

- `DONE`: há execução no dia (execuções acima da meta também contam).
- A falta da semana (`meta − execuções`) é atribuída aos dias ainda abertos, nesta ordem: **hoje**, depois
  do mais recente ao mais antigo. Dia atribuído e passado → `MISSED`; hoje → `PENDING`.
- Dia aberto sem atribuição → `OPTIONAL` ("Dia livre"): pode receber execução e não conta na meta.
- Consequência: um dia só vira "Não realizado" quando a semana já não tem dias restantes para alcançar a
  meta. O estado de um dia depende só da sua semana, nunca da janela consultada.
- Semana encurtada (início/fim do hábito, pausa, troca de programação no meio da semana): meta
  proporcional, arredondada para cima — `ceil(N × diasVigentes / 7)`.

`expected` continua sendo a contagem de `DONE | PENDING | MISSED`; `completed`, a de `DONE`.

## Contrato

- `POST /habits/user/{id}` e `PUT /habits/user/{id}/{habitId}`: novo campo opcional `weeklyTarget` (1–7).
  Informe `weekdays` **ou** `weeklyTarget`; ambos ou nenhum → 400.
- Respostas: `schedules[].weeklyTarget` (nulo para dias fixos) e novo estado de dia `OPTIONAL`.
- Idempotência: o hash de criação sem `weeklyTarget` é o mesmo de antes (recibos antigos continuam válidos).
- O MCP não expõe hábitos; sem mudança lá.

## Implementação

- `HabitCalendar` (puro, em memória) calcula os estados; `HabitService` só carrega em lote e agrega.
  As execuções são lidas em semanas inteiras ao redor do período.
- Front: seletor "Dias fixos / Vezes por semana" no editor, rótulo "Dia livre" e marcação do dia livre de hoje na matriz.

## Rollback

Reverter o código exige antes converter ou remover programações com `weekly_target` (o código antigo as
leria como "todos os dias"). A coluna pode então ser descartada com uma nova migração.

## Evidência

- `HabitCalendarTest` (unitário): regra semanal, falta só quando inalcançável, proporcionalidade,
  dias fixos inalterados, troca no meio da semana.
- `StatisticsPostgresTest.weeklyTargetHabitsCountAnyDayAndOnlyMissWhatTheWeekCanNoLongerReach`
  (PostgreSQL 15 + Flyway): validação, idempotência, `CHECK` da migração, execução em dia livre,
  semana aberta e fechada, troca de dias fixos para meta semanal.
- `habit-controls.test.tsx`: marcação de dia livre na matriz; criação e exibição de hábito semanal.
