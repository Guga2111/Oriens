import { CalendarClock, ListChecks, Target } from 'lucide-react';
import { HeaderFilterPanel } from '@/components/common/HeaderFilterPanel';
import { WorkSelect } from '@/components/common/WorkSelect';
import { taskFilterSections } from '@/components/tasks/TaskFilterSections';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';
import { useId } from 'react';
import { activeTaskFilterCount, type TaskFilters } from '@/lib/task-filters';
import type { BoardFilters } from '@/services/projectService';
import type { WorkObjective } from '@/types/work';

type BoardFilterParam = 'objective' | 'planning' | 'overdue' | 'open';

export function BoardFilterMenu({ filters, taskFilters, objectives, onChange, onTaskFilterChange, onClear }: {
  filters: BoardFilters;
  taskFilters: TaskFilters;
  objectives: WorkObjective[];
  onChange: (param: BoardFilterParam, value: string) => void;
  onTaskFilterChange: (update: Partial<TaskFilters>) => void;
  onClear: () => void;
}) {
  const id = useId();
  const count = activeTaskFilterCount(taskFilters) + Number(!!filters.objectiveId) + Number(!!filters.planning)
    + Number(!!filters.overdue) + Number(!!filters.open);
  const sections = taskFilterSections({ filters: taskFilters, onChange: onTaskFilterChange });
  sections.push(
    { id: 'objective', icon: Target, label: 'Objetivo', count: Number(!!filters.objectiveId),
      fields: <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-objective`}>Objetivo</FieldLabel>
        <WorkSelect id={`${id}-objective`} label="Objetivo" value={filters.objectiveId ? String(filters.objectiveId) : 'none'}
          onChange={value => onChange('objective', value)}
          options={[{ value: 'none', label: 'Todos os objetivos' }, ...objectives.map(objective => ({ value: String(objective.id), label: objective.title }))]} />
      </Field> },
    { id: 'planning', icon: CalendarClock, label: 'Planejamento', count: Number(!!filters.planning),
      fields: <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-planning`}>Planejamento</FieldLabel>
        <WorkSelect id={`${id}-planning`} label="Planejamento" value={filters.planning ?? 'none'}
          onChange={value => onChange('planning', value)}
          options={[{ value: 'none', label: 'Qualquer planejamento' }, { value: 'today', label: 'Planejadas para hoje' }, { value: 'unscheduled', label: 'Sem planejamento' }]} />
      </Field> },
    { id: 'board', icon: ListChecks, label: 'Opções do quadro', count: Number(!!filters.overdue) + Number(!!filters.open),
      fields: <FieldSet className="gap-1">
        <FieldLabel className="min-h-8 items-center gap-2 font-normal max-lg:min-h-11">
          <Checkbox checked={!!filters.overdue} onCheckedChange={checked => onChange('overdue', checked === true ? '1' : '')} />Prazo ultrapassado
        </FieldLabel>
        <FieldLabel className="min-h-8 items-center gap-2 font-normal max-lg:min-h-11">
          <Checkbox checked={!!filters.open} onCheckedChange={checked => onChange('open', checked === true ? '1' : '')} />Somente abertas
        </FieldLabel>
      </FieldSet> },
  );
  return <HeaderFilterPanel title="Filtros do quadro" count={count} onClear={onClear}
    description="Refine as tarefas deste projeto." sections={sections} />;
}
