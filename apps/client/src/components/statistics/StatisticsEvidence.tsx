import { useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProjectCoverThumbnail } from '@/components/projects/ProjectCoverThumbnail';
import { Button } from '@/components/ui/button';
import { useActivity, useFinancialEvidence, useHabitStatistics, useTaskEvidence } from '@/hooks/useStatistics';
import { QueryContent, AnalysisEmpty } from './AnalysisPrimitives';
import { TaskVolumeChart } from './AnalysisCharts';
import { fullDate, intervalLabel, shortDate } from '@/lib/statistics';
import { formatCurrency } from '@/lib/format';
import type { Interval } from '@/types/statistics';

export type Evidence = { kind: 'completed' | 'planned' | 'overdue' | 'finance' | 'day'; period: Interval; tagId?: number; tagName?: string; projectId?: number; projectName?: string; unassigned?: boolean };
export function StatisticsEvidence({ selection, onClose, opener }: { selection: Evidence; onClose: () => void; opener: RefObject<HTMLElement> }) {
  const [page, setPage] = useState(0), isFinance = selection.kind === 'finance', isDay = selection.kind === 'day';
  const tasks = useTaskEvidence(selection.period, isDay ? 'completed' : selection.kind, page, !isFinance, selection.projectId, selection.unassigned);
  const entries = useFinancialEvidence(selection.period, page, isFinance, selection.tagId);
  const activity = useActivity(selection.period, selection.kind === 'completed' || isDay), habits = useHabitStatistics(selection.period, isDay);
  const titles = { completed: 'Tarefas concluídas', planned: 'Tarefas planejadas', overdue: 'Atrasadas hoje', finance: selection.tagName ?? 'Lançamentos do período', day: fullDate(selection.period.startDate) };
  const pagination = isFinance ? entries.data : tasks.data;
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl statistics-screen" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
    <SheetHeader><SheetTitle>{titles[selection.kind]}</SheetTitle><SheetDescription>{intervalLabel(selection.period)}{selection.projectName ? ` · ${selection.projectName}` : ''}{isDay ? ' · data real de conclusão e execução' : ''}</SheetDescription></SheetHeader>
    <div className="mt-5 flex flex-col gap-5">
      {selection.kind === 'completed' && <QueryContent query={activity} label="volume de conclusões">{value => <><p className="text-sm">{value.total} tarefas concluídas · {selection.period.startDate < value.coverageFrom ? 'cobertura histórica parcial' : 'registros atuais'}</p><TaskVolumeChart period={selection.period} days={value.days} coverageFrom={value.coverageFrom} /></>}</QueryContent>}
      {isFinance ? <QueryContent query={entries} label="lançamentos">{value => value.content.length === 0 ? <AnalysisEmpty title="Nenhum lançamento neste intervalo" /> : <div className="flex flex-col gap-1"><p className="text-sm text-muted-foreground">{value.totalElements} lançamentos encontrados</p>{value.content.map(entry => <div className="flex items-start justify-between gap-4 border-b py-3" key={entry.id}><div className="min-w-0"><p className="text-sm font-medium">{entry.description || 'Sem descrição'}</p><p className="text-xs text-muted-foreground">{shortDate(entry.entryDate)}{entry.parentEntryId ? ' · registro automático' : entry.isRecurring ? ' · início de recorrência' : ''}</p></div><span className="shrink-0 text-sm tabular-nums">{formatCurrency(entry.amount)}</span></div>)}</div>}</QueryContent>
        : <QueryContent query={tasks} label="tarefas">{value => <div className="flex flex-col gap-1"><h2 className="text-base font-semibold">Tarefas · {value.totalElements}</h2>{value.content.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhuma tarefa encontrada.{isDay && activity.data && selection.period.startDate < activity.data.coverageFrom ? ' Sem cobertura histórica confirmada para este dia.' : ''}</p> : value.content.map(task => <div className="flex items-start justify-between gap-3 border-b py-3" key={task.id}><div className="min-w-0"><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground"><ProjectCoverThumbnail imageUrl={task.projectImageUrl} className="mr-1 inline-block align-text-bottom" />{task.projectTitle ?? 'Sem projeto'}{task.completedAt ? ` · concluída ${shortDate(task.completedAt)}` : ''}{task.plannedDate ? ` · planejada ${shortDate(task.plannedDate)}` : ''}{task.dueDate ? ` · prazo ${shortDate(task.dueDate)}` : ''}{selection.kind === 'planned' && task.completedAt && task.completedAt > selection.period.endDate ? ' · conclusão após o intervalo' : ''}</p></div>{task.projectId && <Button asChild variant="link"><Link to={`/tasks/project/${task.projectId}`}>Projeto</Link></Button>}</div>)}</div>}</QueryContent>}
      {isDay && <QueryContent query={habits} label="execuções de hábitos">{value => {
        const completed = value.habits.filter(h => h.days.some(day => day.state === 'DONE'));
        return <div><h2 className="text-base font-semibold">Execuções de hábitos · {completed.length}</h2>{completed.length ? completed.map(h => <p className="border-b py-3 text-sm" key={h.id}>{h.name} · realizado</p>) : <p className="py-3 text-sm text-muted-foreground">Nenhuma execução registrada.{selection.period.startDate < value.coverageFrom ? ' O domínio de hábitos ainda não tinha cobertura nesta data.' : ''}</p>}</div>;
      }}</QueryContent>}
      {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><span className="text-xs tabular-nums">{page * pagination.size + 1}–{Math.min((page + 1) * pagination.size, pagination.totalElements)} de {pagination.totalElements}</span><Button variant="outline" disabled={page + 1 >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}
      <p className="text-xs text-muted-foreground">Registros atuais. Reabertura, exclusão e correções podem alterar contagens anteriores.</p>
    </div>
  </SheetContent></Sheet>;
}
