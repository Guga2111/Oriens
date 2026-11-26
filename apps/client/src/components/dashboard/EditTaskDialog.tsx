import { TaskEditor } from '@/components/tasks/TaskEditor';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useTaskDetail } from '@/hooks/useWork';
import type { Task } from '@/types/task';

export function EditTaskDialog(props: { task: Task; open: boolean; onOpenChange: (open: boolean) => void; onTaskUpdated: () => void }) {
  return props.open ? <LoadedEditor {...props} /> : null;
}
function LoadedEditor({ task, open, onOpenChange, onTaskUpdated }: { task: Task; open: boolean; onOpenChange: (open: boolean) => void; onTaskUpdated: () => void }) {
  const detail = useTaskDetail(task.id);
  return detail.data ? <TaskEditor open={open} onOpenChange={onOpenChange} task={detail.data} onSaved={onTaskUpdated} /> :
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Editar tarefa" description="Carregando os dados atuais da tarefa."><WorkFeedback error={detail.error} retry={() => void detail.refetch()} /></ResponsiveDialog>;
}
