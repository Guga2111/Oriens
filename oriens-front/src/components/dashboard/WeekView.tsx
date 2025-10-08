import { Task, TaskCard } from './TaskCard';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
  onUpdateTasks: () => void;
  onEditTask: (task: Task) => void;
  viewMode: 'day' | 'week';
}

export function WeekView({ tasks, currentDate, onUpdateTasks, onEditTask, viewMode }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });

  const getTasksForDay = (day: Date) => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    return tasks
      .filter(task => task.dueDate === formattedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="grid grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => {
        const day = addDays(weekStart, i);
        const dayTasks = getTasksForDay(day);

        return (
          <div key={day.toString()} className="flex min-w-0 flex-col gap-4 p-2 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-sm font-medium capitalize">
                {format(day, 'EEE', { locale: ptBR })}
              </p>
              <p className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                {format(day, 'dd')}
              </p>
            </div>
            <div className="space-y-2">
              {dayTasks.length > 0 ? (
                dayTasks.map(task => (
                  <TaskCard 
                    key={task.id}
                    task={task}
                    onUpdate={onUpdateTasks}
                    onEdit={onEditTask}
                    viewMode={viewMode}
                  />
                ))
              ) : (
                <div className="text-xs text-center text-muted-foreground pt-4">Nenhuma tarefa</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}