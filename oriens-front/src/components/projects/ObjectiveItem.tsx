import {
  Calendar,
  CheckCircle2,
  Circle,
  Edit,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDue, parseLocalDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ObjectiveDTO } from "@/types/project";

interface ObjectiveItemProps {
  objective: ObjectiveDTO;
  /**
   * Índice ORIGINAL em `project.objectives`. Nunca use a posição visual:
   * a API endereça objetivos por índice (SPEC §11.3/§11.4).
   */
  index: number;
  onToggleStatus: (index: number) => void;
  isUpdating?: boolean;
  /** Presente no detalhe; no card o objetivo só alterna o status. */
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
}

/**
 * Linha de objetivo compartilhada por `/projects` e `/tasks/project/:id`
 * (SPEC §11.3/§11.4). O `index` recebido é sempre o original, mesmo quando a
 * lista visual está ordenada por vencimento.
 */
export function ObjectiveItem({
  objective,
  index,
  onToggleStatus,
  isUpdating = false,
  onEdit,
  onDelete,
}: ObjectiveItemProps) {
  const isConcluded = objective.status === "CONCLUDED";
  const dueDate = formatDue(objective.dueDate);
  const due = parseLocalDate(objective.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = !isConcluded && !!due && due < today;

  const hasMenu = !!onEdit || !!onDelete;

  return (
    <li className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="mt-0.5 h-10 w-10 shrink-0 rounded-full md:h-7 md:w-7"
        onClick={() => onToggleStatus(index)}
        disabled={isUpdating}
        aria-pressed={isConcluded}
        aria-label={
          isConcluded
            ? `Reabrir objetivo: ${objective.title}`
            : `Concluir objetivo: ${objective.title}`
        }
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : isConcluded ? (
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-5",
            isConcluded && "line-through text-muted-foreground"
          )}
        >
          {objective.title}
        </p>
        {dueDate && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 text-xs",
              isOverdue ? "text-negative" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            {isOverdue ? "Venceu em" : "Vence em"} {dueDate}
          </p>
        )}
      </div>

      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 md:h-8 md:w-8"
              aria-label={`Ações do objetivo: ${objective.title}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(index)}>
                <Edit className="mr-2 h-4 w-4" aria-hidden />
                <span>Editar</span>
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(index)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                <span>Excluir</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
