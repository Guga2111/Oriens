import type { ReactNode } from 'react';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { parseLocalDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { WorkProject } from '@/types/work';

const percent = (done: number, total: number) => Math.trunc(done / total * 100);

/** Project progress and objective deadlines: the simple project's sidebar and the development project's Panorama. */
export function ProjectSummaryCard({ project, fitCalendar, children }: { project: WorkProject; fitCalendar?: boolean; children?: ReactNode }) {
  const s = project.summary;
  const objectives = s.totalObjectives ? percent(s.completedObjectives, s.totalObjectives) : 0;
  const tasks = project.mode === 'DEVELOPMENT' && s.nonCancelledTasks ? percent(s.completedTasks ?? 0, s.nonCancelledTasks) : null;
  return (
    <aside className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 md:p-5" aria-label="Informações do projeto">
      <h2 className="text-base font-semibold">Resumo</h2>
      <p className="text-sm">{s.totalObjectives ? `${s.completedObjectives}/${s.totalObjectives} objetivos concluídos` : 'Nenhum objetivo definido'}</p>
      {s.totalObjectives > 0 && <Progress value={objectives} aria-label={`${objectives}% dos objetivos concluídos`} />}
      {tasks !== null && <>
        <p className="text-sm">{s.completedTasks ?? 0}/{s.nonCancelledTasks} tarefas concluídas</p>
        <Progress value={tasks} aria-label={`${tasks}% das tarefas concluídas`} />
      </>}
      <p className="text-sm">{s.overdueObjectiveCount} objetivos com prazo ultrapassado</p>
      <h2 className="mt-2 text-base font-semibold">Calendário</h2>
      <p className="text-sm text-muted-foreground">Prazos dos objetivos</p>
      <Calendar
        mode="multiple"
        selected={(project.objectives ?? []).map(o => parseLocalDate(o.dueDate)).filter((d): d is Date => !!d)}
        locale={ptBR}
        className={cn('mx-auto max-w-full p-0', fitCalendar &&
          'max-md:w-full max-md:max-w-xs max-md:[&_table]:table-fixed max-md:[&_:is(th,td)]:min-w-0 max-md:[&_:is(th,td)]:flex-1 max-md:[&_td>button]:w-full max-md:[&_td>button]:min-w-0')}
        labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês' }}
      />
      {children}
    </aside>
  );
}
