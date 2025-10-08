import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  MoreHorizontal,
  Check,
  Circle,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Task {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "ON_DOING" | "CONCLUDED";
}

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
  onEdit: (task: Task) => void;
  viewMode: "day" | "week";
}

export function TaskCard({ task, onUpdate, onEdit, viewMode }: TaskCardProps) {
  const isConcluded = task.status === "CONCLUDED";

  const [isUpdating, setIsUpdating] = useState(false);

  const priorityVariants: {
    [key in Task["priority"]]: "default" | "secondary" | "destructive";
  } = {
    LOW: "secondary",
    MEDIUM: "default",
    HIGH: "destructive",
  };

  const handleToggleStatus = async () => {
    const newStatus = isConcluded ? "PENDING" : "CONCLUDED";
    try {
      await apiClient.put(`/task/${task.id}`, { ...task, status: newStatus });
      toast({ title: "Status da tarefa atualizado!" });
      onUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a tarefa.",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/task/${task.id}`);
      toast({ title: "Tarefa deletada com sucesso." });
      onUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível deletar a tarefa.",
      });
    }
  };

  const DayViewLayout = () => (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full mt-1 flex-shrink-0"
          onClick={handleToggleStatus}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isConcluded ? (
            <Check className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        <div className="flex flex-col gap-2 min-w-0">
          <div>
            <p
              className={`font-medium break-words ${
                isConcluded ? "line-through" : ""
              }`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-sm text-muted-foreground break-words">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.startTime.substring(0, 5)}</span>
            </div>
            <Badge variant={priorityVariants[task.priority]}>
              {task.priority}
            </Badge>
          </div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => onEdit(task)}
            className="flex cursor-pointer items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleDelete}
            className="flex cursor-pointer items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const WeekViewLayout = () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full flex-shrink-0"
          onClick={handleToggleStatus}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isConcluded ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* A classe 'flex-1' força o título a ocupar o espaço que sobra,
            e 'min-w-0' permite que ele encolha e quebre a linha. */}
        <p
          className={`font-medium text-sm leading-snug break-words flex-1 min-w-0 ${
            isConcluded ? "line-through" : ""
          }`}
        >
          {task.title}
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => onEdit(task)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(task.startTime || task.priority) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pl-7">
          {task.startTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.startTime.substring(0, 5)}</span>
            </div>
          )}
          {task.priority && (
            <Badge
              variant={priorityVariants[task.priority]}
              className="h-5 text-xs"
            >
              {task.priority}
            </Badge>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card
      className={cn(
        "mb-2",
        isConcluded && "opacity-60",
        isUpdating && "opacity-40 pointer-events-none"
      )}
    >
      <CardContent className="p-2">
        {viewMode === "day" ? <DayViewLayout /> : <WeekViewLayout />}
      </CardContent>
    </Card>
  );
}
