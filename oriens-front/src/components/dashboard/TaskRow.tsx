import { useState } from "react";
import { Clock, MapPin, MoreHorizontal, Pencil, Play, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LocationMap } from "@/components/dashboard/LocationMap";
import { useSound } from "@/hooks/useSound";
import { PRIORITY, TASK_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api";
import type { Task, TaskStatus } from "@/types/task";
import { toast } from "sonner";

interface TaskRowProps {
  task: Task;
  onUpdate: () => void;
  onEdit: (task: Task) => void;
}

/**
 * Linha de tarefa da visão dia (SPEC §11.1). O checkbox alterna
 * PENDING|ON_DOING → CONCLUDED e CONCLUDED → PENDING; o terceiro estado é
 * definido pelo menu "⋯" (D9).
 */
export function TaskRow({ task, onUpdate, onEdit }: TaskRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const playConcludedSound = useSound("/concluding-sound.wav");

  const isConcluded = task.status === "CONCLUDED";
  const isOnDoing = task.status === "ON_DOING";
  const priority = PRIORITY[task.priority];
  const status = TASK_STATUS[task.status];

  const updateStatus = async (newStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      // Contrato atual: PUT recebe a tarefa inteira.
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

  const handleToggle = () => {
    void updateStatus(isConcluded ? "PENDING" : "CONCLUDED");
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/task/${task.id}`);
      setAnnouncement(`Tarefa excluída: ${task.title}`);
      onUpdate();
    } catch (error) {
      console.error("Falha ao excluir tarefa: ", error);
      toast.error("Erro", {
        description: "Não foi possível excluir a tarefa.",
      });
    }
  };

  return (
    <li
      id={`task-row-${task.id}`}
      tabIndex={-1}
      className="grid grid-cols-[auto_3.5rem_minmax(0,1fr)_auto_auto] items-start gap-3 border-b px-2 py-3 last:border-b-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      <div className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center">
        <Checkbox
          checked={isConcluded ? true : isOnDoing ? "indeterminate" : false}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
          aria-label={
            isOnDoing
              ? `Concluir ${task.title} (em andamento)`
              : `Concluir ${task.title}`
          }
        />
      </div>

      <span className="flex items-center gap-1 pt-2 text-sm tabular-nums text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
        {task.startTime.slice(0, 5)}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p
            className={cn(
              "min-w-0 truncate font-medium",
              isConcluded && "text-muted-foreground line-through"
            )}
            title={task.title}
          >
            {task.title}
          </p>
          {isOnDoing && <Badge variant="warning">Em andamento</Badge>}
        </div>

        {task.description && (
          <p
            className="truncate text-sm text-muted-foreground"
            title={task.description}
          >
            {task.description}
          </p>
        )}

        {task.location?.address && (
          <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate" title={task.location.address}>
              {task.location.address}
            </span>
            <button
              type="button"
              className="shrink-0 underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsMapOpen(true)}
            >
              Ver no mapa
            </button>
          </div>
        )}
      </div>

      <Badge variant={priority.badge} className="mt-1">
        {priority.label}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
          {task.location && (
            <DropdownMenuItem onSelect={() => setIsMapOpen(true)}>
              <MapPin className="mr-2 h-4 w-4" aria-hidden />
              Ver no mapa
            </DropdownMenuItem>
          )}
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

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        {task.location && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{task.location.address || task.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 overflow-hidden rounded-lg">
              <LocationMap
                lat={task.location.latitude ?? 0}
                lng={task.location.longitude ?? 0}
                taskTitle={task.title}
                taskSubtitle={task.description}
                priority={task.priority}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>

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
    </li>
  );
}
