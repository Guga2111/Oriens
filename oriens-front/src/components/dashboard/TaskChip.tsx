import { useState } from "react";
import { MoreHorizontal, Pencil, Play, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useSound } from "@/hooks/useSound";
import { PRIORITY } from "@/lib/labels";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";
import { toast } from "sonner";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  HIGH: "bg-negative",
  MEDIUM: "bg-now",
  LOW: "bg-muted-foreground",
};

interface TaskChipProps {
  task: Task;
  onUpdate: () => void;
  onEdit: (task: Task) => void;
}

/**
 * Chip compacto da visão semanal (SPEC §11.2): hora tabular, título com
 * `line-clamp` (nunca `break-all`), prioridade só como ponto de 6 px e menu.
 */
export function TaskChip({ task, onUpdate, onEdit }: TaskChipProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const playConcludedSound = useSound("/concluding-sound.wav");

  const isConcluded = task.status === "CONCLUDED";
  const isOnDoing = task.status === "ON_DOING";
  const priority = PRIORITY[task.priority];

  const updateStatus = async (newStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      await apiClient.put(`/task/${task.id}`, { ...task, status: newStatus });

      if (newStatus === "CONCLUDED") {
        setAnnouncement(`Tarefa concluída: ${task.title}`);
        playConcludedSound();
      } else if (newStatus === "ON_DOING") {
        setAnnouncement(`Tarefa em andamento: ${task.title}`);
      } else {
        setAnnouncement(`Tarefa voltou para a fazer: ${task.title}`);
      }

      onUpdate();
    } catch (error) {
      console.error("Falha ao atualizar tarefa: ", error);
      toast.error("Erro", {
        description: "Não foi possível atualizar a tarefa.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/task/${task.id}`);
      onUpdate();
    } catch (error) {
      console.error("Falha ao excluir tarefa: ", error);
      toast.error("Erro", {
        description: "Não foi possível excluir a tarefa.",
      });
    }
  };

  return (
    <div className="rounded-md border bg-card p-2">
      <div className="flex items-start gap-1">
        <div className="-m-1.5 flex h-8 w-8 shrink-0 items-center justify-center">
          <Checkbox
            checked={isConcluded ? true : isOnDoing ? "indeterminate" : false}
            onCheckedChange={() =>
              void updateStatus(isConcluded ? "PENDING" : "CONCLUDED")
            }
            aria-busy={isUpdating}
            disabled={isUpdating}
            aria-label={
              isOnDoing
                ? `Concluir ${task.title} (em andamento)`
                : `Concluir ${task.title}`
            }
            className="task-completion h-4 w-4"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs tabular-nums text-muted-foreground">
              {(task.startTime?.slice(0, 5) ?? "Sem horário")}
            </span>
            <span
              aria-hidden
              className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])}
            />
            <span className="sr-only">{priority.label}</span>
          </div>
          <p
            className={cn(
              "mt-1 line-clamp-3 text-sm font-medium leading-snug xl:line-clamp-2",
              isConcluded && "text-muted-foreground line-through"
            )}
            title={task.title}
          >
            {task.title}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1 h-6 w-6 shrink-0"
              aria-label={`Ações da tarefa ${task.title}`}
                disabled={isUpdating}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              Editar
            </DropdownMenuItem>
            {isOnDoing || isConcluded ? (
              <DropdownMenuItem onSelect={() => void updateStatus("PENDING")}>
                <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                Voltar para a fazer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void updateStatus("ON_DOING")}>
                <Play className="mr-2 h-4 w-4" aria-hidden />
                Marcar como em andamento
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir tarefa?"
        objectName={`"${task.title}"`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        description={
          <>
            Excluir a tarefa <strong>"{task.title}"</strong>? Esta ação não pode
            ser desfeita.
          </>
        }
      />
    </div>
  );
}
