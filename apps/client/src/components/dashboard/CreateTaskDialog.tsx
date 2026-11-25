import { format } from 'date-fns';
import { TaskEditor } from '@/components/tasks/TaskEditor';

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated, defaultDate, defaultStartTime }: {
  open: boolean; onOpenChange: (open: boolean) => void; onTaskCreated: () => void; defaultDate?: Date; defaultStartTime?: string;
}) {
  return <TaskEditor open={open} onOpenChange={onOpenChange} onSaved={onTaskCreated}
    plannedDate={defaultDate ? format(defaultDate, 'yyyy-MM-dd') : undefined} startTime={defaultStartTime} />;
}
