// src/components/dashboard/TaskSection.tsx

import type { ReactNode } from 'react';
import { Task } from './TaskCard';
import { Card } from '@/components/ui/card';
import { TaskCard } from './TaskCard';

interface TaskSectionProps {
  title: string;
  timeRange: string;
  icon: ReactNode;
  tasks: Task[];
  onUpdateTasks: () => void;
  onEditTask: (task: Task) => void;
  viewMode: 'day' | 'week';
}

export function TaskSection({ title, timeRange, icon, tasks, onUpdateTasks, onEditTask, viewMode }: TaskSectionProps) {
  
  const concludedCount = tasks.filter(t => t.status === 'CONCLUDED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{timeRange}</p>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {concludedCount} de {tasks.length} concluídas
        </p>
      </div>
      
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={onUpdateTasks}
            onEdit={onEditTask}
            viewMode={viewMode}
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground ml-12">
          Nenhuma tarefa para {title.toLowerCase()}.
        </p>
      )}
    </div>
  );
}