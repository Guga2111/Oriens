import { useId } from 'react';
import {
  ArrowRightLeft, CircleCheck, FilePenLine, FolderPlus, History, ImagePlus, ListPlus, LogIn,
  LogOut, Pencil, Settings2, Target, Trash2, type LucideIcon,
} from 'lucide-react';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectActivity } from '@/hooks/useWork';
import { PRODUCT_TIMEZONE } from '@/lib/product-time';
import type { ProjectActivityKind } from '@/types/work';

const time = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: PRODUCT_TIMEZONE });
const actions: Record<ProjectActivityKind, { label: string; icon: LucideIcon }> = {
  PROJECT_CREATED: { label: 'criou o projeto', icon: FolderPlus },
  PROJECT_UPDATED: { label: 'alterou o projeto', icon: Settings2 },
  DESCRIPTION_UPDATED: { label: 'editou a descrição', icon: FilePenLine },
  COVER_UPDATED: { label: 'atualizou a capa', icon: ImagePlus },
  OBJECTIVE_CREATED: { label: 'criou o objetivo', icon: Target },
  OBJECTIVE_UPDATED: { label: 'alterou o objetivo', icon: Pencil },
  OBJECTIVE_REMOVED: { label: 'removeu o objetivo', icon: Trash2 },
  TASK_CREATED: { label: 'criou a tarefa', icon: ListPlus },
  TASK_ADDED: { label: 'adicionou a tarefa', icon: LogIn },
  TASK_MOVED: { label: 'moveu a tarefa', icon: ArrowRightLeft },
  TASK_COMPLETED: { label: 'concluiu a tarefa', icon: CircleCheck },
  TASK_REMOVED: { label: 'retirou do projeto a tarefa', icon: LogOut },
};

export function ProjectActivityFeed({ projectId }: { projectId: number }) {
  const activity = useProjectActivity(projectId);
  const headingId = useId();
  const pages = activity.data?.pages ?? [];
  const empty = activity.isSuccess && !pages[0]?.items.length;

  return <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3 border-t pt-6">
    <h2 id={headingId} className="text-base font-semibold">Atividade</h2>
    {activity.isPending && <div role="status" aria-label="Carregando atividade"><Skeleton className="h-20 w-full" /></div>}
    <WorkFeedback error={activity.error}
      retry={() => void (activity.isFetchNextPageError ? activity.fetchNextPage() : activity.refetch())} />
    {empty && <Empty className="items-start border p-4 text-left md:p-4">
      <EmptyDescription>As próximas mudanças no projeto, nos objetivos e nas tarefas aparecem aqui.</EmptyDescription>
    </Empty>}
    {Boolean(pages[0]?.items.length) && <ul className="divide-y">
      {pages.flatMap(page => page.items.map(event => {
        const { label, icon: Icon } = actions[event.kind] ?? { label: 'registrou uma alteração', icon: History };
        return <li key={event.id} className="flex min-w-0 items-start gap-3 py-3 text-sm">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 break-words">
            <p><span className="font-medium">{page.actor}</span> {label}{event.subjectTitle && <> <span className="font-medium">{event.subjectTitle}</span></>}.</p>
            <time className="text-xs text-muted-foreground" dateTime={event.occurredAt}>{time.format(new Date(event.occurredAt))}</time>
          </div>
        </li>;
      }))}
    </ul>}
    {activity.hasNextPage && !activity.isFetchNextPageError && <Button type="button" variant="outline" size="sm"
      className="self-start" disabled={activity.isFetching} onClick={() => void activity.fetchNextPage()}>
      {activity.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
    </Button>}
  </section>;
}
