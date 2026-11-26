import { Info, Layers2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ObjectiveMenu, ObjectivePinButton, type ObjectiveActionHandlers } from './ObjectiveActions';
import { ObjectivePeriodPicker, ObjectiveStatusPicker } from './ObjectiveProperties';
import { objectiveProgressParts, type ObjectiveStatus } from '@/lib/objectives';
import { objectiveWorkItemsHref } from '@/lib/project-tabs';
import type { WorkObjective, WorkTask } from '@/types/work';

type Patch = { status?: ObjectiveStatus; startDate?: string | null; dueDate?: string | null };

/** Done, in progress and the rest of the objective's tasks, as plane.so's module cards draw them. */
function ProgressBar({ objective, tasks }: { objective: WorkObjective; tasks?: WorkTask[] }) {
  const { total, done, started, rest } = objectiveProgressParts(objective, tasks);
  const label = total ? `${done} concluídas, ${started} em andamento e ${rest} restantes de ${total} tarefas` : 'Nenhuma tarefa ativa vinculada';
  // Each part grows by its count, so the widths are runtime values (frontend.md §3.4).
  return <div role="img" aria-label={label} className="flex h-2 gap-px overflow-hidden rounded-sm">
    {done > 0 && <div className="bg-state-completed" style={{ flexGrow: done }} />}
    {started > 0 && <div className="bg-state-started" style={{ flexGrow: started }} />}
    {(rest > 0 || !total) && <div className="bg-muted-foreground/50" style={{ flexGrow: rest || 1 }} />}
  </div>;
}

function ObjectiveCard({ objective, projectId, tasks, busy, onOpen, onPatch, actions }: {
  objective: WorkObjective; projectId: number; tasks?: WorkTask[]; busy: boolean;
  onOpen: (id: number) => void; onPatch: (objective: WorkObjective, fields: Patch) => Promise<boolean>; actions: ObjectiveActionHandlers;
}) {
  const { total, done } = objectiveProgressParts(objective, tasks);
  return <Card className="relative flex h-full min-w-0 flex-col gap-3 p-4 transition-colors hover:border-foreground/20">
    <div className="flex min-w-0 items-start gap-2">
      <h3 className="min-w-0 flex-1 break-words text-sm font-medium leading-8">
        {/* The title's ::after covers the card, so a click anywhere opens the work items; controls sit on z-10. */}
        <Link to={objectiveWorkItemsHref(projectId, objective.id)} aria-label={`${objective.title} — ver itens de trabalho`}
          className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
          {objective.title}
        </Link>
      </h3>
      <div className="relative z-10 flex shrink-0 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Informações de ${objective.title}`} onClick={() => onOpen(objective.id)}><Info aria-hidden /></Button>
          </TooltipTrigger>
          <TooltipContent>Informações</TooltipContent>
        </Tooltip>
        <ObjectivePinButton objective={objective} disabled={busy} onPin={actions.onPin} />
        <ObjectiveMenu objective={objective} disabled={busy} {...actions} />
      </div>
    </div>
    <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
      <Layers2 aria-hidden className="size-3.5 shrink-0" />{total ? `${done}/${total} tarefas` : 'Nenhuma tarefa'}
    </p>
    <ProgressBar objective={objective} tasks={tasks} />
    <div className="relative z-10 flex flex-wrap items-center gap-2">
      <ObjectivePeriodPicker objective={objective} disabled={busy} onSave={(startDate, dueDate) => onPatch(objective, { startDate, dueDate })} />
      <ObjectiveStatusPicker value={objective.status} label={`Status de ${objective.title}`} disabled={busy}
        onChange={status => { if (status !== objective.status) void onPatch(objective, { status }); }} />
    </div>
  </Card>;
}

/** Objectives as cards, three to a row on wide screens (plane.so's module gallery). */
export function ObjectiveGallery({ objectives, projectId, tasks, busy, onOpen, onPatch, actions }: {
  objectives: WorkObjective[]; projectId: number; tasks?: WorkTask[]; busy: boolean;
  onOpen: (id: number) => void; onPatch: (objective: WorkObjective, fields: Patch) => Promise<boolean>; actions: ObjectiveActionHandlers;
}) {
  return <ul aria-label="Galeria de objetivos" className="grid gap-6 px-page py-6 sm:grid-cols-2 md:px-6 xl:grid-cols-3">
    {objectives.map(objective => <li key={objective.id} id={`objective-${objective.id}`} className="min-w-0">
      <ObjectiveCard objective={objective} projectId={projectId} tasks={tasks} busy={busy} onOpen={onOpen} onPatch={onPatch} actions={actions} />
    </li>)}
  </ul>;
}
