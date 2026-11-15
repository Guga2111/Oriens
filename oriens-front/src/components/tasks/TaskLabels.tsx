import { LABEL_COLORS } from '@/lib/task-labels';
import { Badge } from '@/components/ui/badge';
import type { TaskLabel } from '@/types/task-label';
export function TaskLabelBadge({ label }: { label: Pick<TaskLabel, 'name' | 'color'> }) {
  return <Badge variant={LABEL_COLORS[label.color]?.variant ?? 'secondary'} className="min-w-0 max-w-full"><span className="min-w-0 break-words">{label.name}</span></Badge>;
}
export function TaskLabels({ labels = [] }: { labels?: TaskLabel[] }) {
  return labels.length ? <ul aria-label="Etiquetas da tarefa" className="mt-2 flex min-w-0 flex-wrap gap-1.5">{labels.map(label => <li key={label.id} className="min-w-0 max-w-full"><TaskLabelBadge label={label} /></li>)}</ul> : null;
}
