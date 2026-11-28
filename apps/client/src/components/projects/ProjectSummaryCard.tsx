import type { ReactNode } from 'react';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { parseLocalDate } from '@/lib/date';
import type { WorkProject } from '@/types/work';

const percent = (done: number, total: number) => Math.trunc(done / total * 100);

/** Progress and objective deadlines for simple projects. */
export function ProjectSummaryCard({ project, children }: { project: WorkProject; children?: ReactNode }) {
  const s = project.summary;
  const objectives = s.totalObjectives ? percent(s.completedObjectives, s.totalObjectives) : 0;
  return (
    <aside className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 md:p-5" aria-label="Informações do projeto">
      <h2 className="text-base font-semibold">Resumo</h2>
      <p className="text-sm">{s.totalObjectives ? `${s.completedObjectives}/${s.totalObjectives} objetivos concluídos` : 'Nenhum objetivo definido'}</p>
      {s.totalObjectives > 0 && <Progress value={objectives} aria-label={`${objectives}% dos objetivos concluídos`} />}
      <p className="text-sm">{s.overdueObjectiveCount} objetivos com prazo ultrapassado</p>
      <h2 className="mt-2 text-base font-semibold">Calendário</h2>
      <p className="text-sm text-muted-foreground">Prazos dos objetivos</p>
      <Calendar
        mode="multiple"
        selected={(project.objectives ?? []).map(o => parseLocalDate(o.dueDate)).filter((d): d is Date => !!d)}
        locale={ptBR}
        className="mx-auto max-w-full p-0"
        labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês' }}
      />
      {children}
    </aside>
  );
}
