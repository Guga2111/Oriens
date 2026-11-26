import { useState } from "react";
import { MapPin, MoreHorizontal, Pencil, Play, Trash2, Undo2 } from "lucide-react";
import { TaskPlanningMenu } from './TaskPlanningMenu';
import { TaskProperties } from './TaskProperties';
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
import { cn } from "@/lib/utils";
import { useTaskActions } from "@/hooks/useTaskActions";
import { WorkFeedback } from "@/components/common/WorkFeedback";
import type { Task, TaskStatus } from "@/types/task";
import type { TaskPatch } from "@/types/work";
import { toast } from "sonner";

interface TaskRowProps {
  task: Task;
  onUpdate: () => void;
  onEdit: (task: Task) => void;
  /** Opens the task panel; without it the title is plain text. */
  onOpen?: (task: Task) => void;
}

/**
 * Linha de tarefa da visão dia (SPEC §11.1), no formato de lista do plane.so:
 * uma linha com título à esquerda e propriedades em chips à direita (no
 * celular os chips descem para a segunda linha). O checkbox alterna
 * PENDING|ON_DOING → CONCLUDED e CONCLUDED → PENDING; o terceiro estado é
 * definido pelo menu "⋯" (D9).
 */
export function TaskRow({ task, onUpdate, onEdit, onOpen }: TaskRowProps) {
  const actions = useTaskActions();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const playConcludedSound = useSound("/concluding-sound.wav");

  const isConcluded = task.status === "CONCLUDED";
  const isOnDoing = task.status === "ON_DOING";

  const updateStatus = async (newStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      await actions.status(task, newStatus);

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

  const plan = async (today: boolean) => {
    setIsUpdating(true);
    try { await actions.planning(task, today); onUpdate(); }
    catch { /* The local feedback retains the row and offers a refresh. */ }
    finally { setIsUpdating(false); }
  };

  const save = async (body: Partial<TaskPatch>) => {
    setIsUpdating(true);
    try { await actions.update(task, body); onUpdate(); return true; }
    catch { return false; /* The local feedback under the row explains the failure. */ }
    finally { setIsUpdating(false); }
  };

  const handleDelete = async () => {
    try {
      await actions.remove(task);
      setAnnouncement(`Tarefa excluída: ${task.title}`);
      onUpdate();
      return true;
    } catch (error) {
      console.error("Falha ao excluir tarefa: ", error);
      toast.error("Erro", {
        description: "Não foi possível excluir a tarefa.",
      });
      return false;
    }
  };

  return (
    <li
      id={`task-row-${task.id}`}
      tabIndex={-1}
      className="relative flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 md:flex-nowrap border-b px-2 py-1.5 last:border-b-0 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      <div className="relative z-10 -m-2 flex h-10 w-10 shrink-0 items-center justify-center">
        <Checkbox
          className="task-completion after:-inset-[14px]"
          checked={isConcluded ? true : isOnDoing ? "indeterminate" : false}
          onCheckedChange={handleToggle}
          aria-busy={isUpdating}
          disabled={isUpdating}
          aria-label={
            isConcluded ? `Reabrir ${task.title}` : isOnDoing
              ? `Concluir ${task.title} (em andamento)`
              : `Concluir ${task.title}`
          }
        />
      </div>

      {/* The title's ::after covers the whole row, so a click anywhere opens the panel while keyboard and
          screen readers still meet one button; the controls above it sit on z-10. No press scale here: a
          transform would make the button the ::after's containing block and shrink the target mid-click. */}
      {onOpen ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-w-0 flex-1 basis-40 justify-start p-0 text-left text-sm font-normal text-foreground after:absolute after:inset-0 hover:bg-transparent active:transform-none md:min-w-60"
          title={task.title}
          aria-haspopup="dialog"
          onClick={() => onOpen(task)}
        >
          <span className={cn("truncate", isConcluded && "text-muted-foreground line-through")}>{task.title}</span>
        </Button>
      ) : (
        <p
          className={cn(
            "min-w-0 flex-1 basis-40 truncate text-sm text-foreground md:min-w-60",
            isConcluded && "text-muted-foreground line-through"
          )}
          title={task.title}
        >
          {task.title}
        </p>
      )}

      <TaskProperties task={task} onSave={save} onOpenMap={() => setIsMapOpen(true)} disabled={isUpdating} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 h-11 w-11 md:h-8 md:w-8"
            aria-label={`Ações da tarefa ${task.title}`}
            disabled={isUpdating}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-sm:[&_[role=menuitem]]:min-h-11">
            <TaskPlanningMenu task={task} onEdit={onEdit} onPlan={today => void plan(today)} />
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
            <DropdownMenuItem onSelect={() => task.projectId ? onEdit(task) : void updateStatus("ON_DOING")}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {task.projectId ? "Mover para…" : "Marcar como em andamento"}
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
                taskSubtitle={task.descriptionText ?? task.description}
                priority={task.priority}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>

      <div className="basis-full empty:hidden">
        <WorkFeedback error={actions.error} retry={() => void actions.refresh(task)} />
      </div>
      <ConfirmDialog error={actions.error}
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
