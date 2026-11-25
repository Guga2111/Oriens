import { LABEL_COLORS } from '@/lib/task-labels';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskLabel } from '@/types/task-label';
export function TaskLabelBadge({ label, className }: { label: Pick<TaskLabel, 'name' | 'color'>; className?: string }) {
  return <Badge variant={LABEL_COLORS[label.color]?.variant ?? 'secondary'} className={cn("min-w-0 max-w-full", className)}><span className="min-w-0 break-words">{label.name}</span></Badge>;
}
export function TaskLabels({ labels = [], inline = false }: { labels?: TaskLabel[]; inline?: boolean }) {
  if (!labels.length) return null;
  return (
    <ul aria-label="Etiquetas da tarefa" className={cn("flex min-w-0 flex-wrap gap-1.5", inline ? "max-w-full border-s ps-2" : "mt-2")}>
      {labels.map(label => (
        <li key={label.id} className="min-w-0 max-w-full">
          <TaskLabelBadge label={label} className={inline ? "px-1.5" : undefined} />
        </li>
      ))}
    </ul>
  );
}
