import { useState, useRef, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Star,
  Target,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ObjectiveItem } from "@/components/projects/ObjectiveItem";
import { parseLocalDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api";
import { useSound } from "@/hooks/useSound";
import { toast } from "sonner";
import type { ObjectiveDTO, ProjectDTO } from "@/types/project";

interface ProjectCardProps {
  project: ProjectDTO;
  onEdit: (project: ProjectDTO) => void;
  onDelete: (projectId: number) => void;
  onProjectUpdate: (updatedProject: ProjectDTO) => void;
}

interface IndexedObjective {
  objective: ObjectiveDTO;
  index: number;
}

/** Pendentes primeiro por vencimento; sem data fica por último. */
function compareByDueDate(a: IndexedObjective, b: IndexedObjective): number {
  const dueA = parseLocalDate(a.objective.dueDate);
  const dueB = parseLocalDate(b.objective.dueDate);

  if (dueA && dueB) return dueA.getTime() - dueB.getTime();
  if (dueA) return -1;
  if (dueB) return 1;
  return a.index - b.index;
}

function objectivesCountLabel(completed: number, total: number): string {
  return `${completed} de ${total} ${total === 1 ? "objetivo" : "objetivos"}`;
}

/**
 * Card de projeto (SPEC §11.3): sem placeholder de imagem, progresso lido de
 * `project.progress` (D10) e até 3 objetivos pendentes ordenados por
 * vencimento — sempre guardando o índice ORIGINAL de `project.objectives`.
 */
export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onProjectUpdate,
}: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playConcludedSound = useSound("/concluding-sound.wav");

  const completedObjectivesCount = project.objectives.filter(
    (objective) => objective.status === "CONCLUDED"
  ).length;

  const indexedObjectives: IndexedObjective[] = project.objectives.map(
    (objective, index) => ({ objective, index })
  );
  const pendingObjectives = indexedObjectives.filter(
    ({ objective }) => objective.status !== "CONCLUDED"
  );
  const nextObjectives = [...pendingObjectives]
    .sort(compareByDueDate)
    .slice(0, 3);
  const hasMoreObjectives = pendingObjectives.length > nextObjectives.length;

  const handleToggleStatus = async (objectiveIndex: number) => {
    const objective = project.objectives[objectiveIndex];
    if (!objective) return;

    setIsUpdating(objectiveIndex);
    const newStatus =
      objective.status === "CONCLUDED" ? "PENDING" : "CONCLUDED";

    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/objective/${objectiveIndex}`,
        { status: newStatus }
      );
      onProjectUpdate(response.data);

      if (newStatus === "CONCLUDED") {
        playConcludedSound();
      }
    } catch {
      toast.error("Erro", {
        description: "Não foi possível atualizar o objetivo.",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("projectImage", file);

    try {
      const response = await apiClient.put<{ projectImageUrl: string }>(
        `/project/${project.id}/picture`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      onProjectUpdate({
        ...project,
        imageUrl: response.data.projectImageUrl,
      });
      toast.success("Imagem atualizada.");
    } catch {
      toast.error("Erro", {
        description: "Não foi possível enviar a imagem.",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/favorite`
      );
      onProjectUpdate(response.data);
    } catch {
      toast.error("Erro", {
        description: "Não foi possível alterar o status de favorito.",
      });
    }
  };

  const handleToggleArchive = async () => {
    try {
      const action = project.archived ? "unarchive" : "archive";
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/${action}`
      );
      onProjectUpdate(response.data);

      toast.success(
        response.data.archived
          ? "Projeto arquivado."
          : "Projeto desarquivado."
      );
    } catch {
      toast.error("Erro", {
        description: "Não foi possível alterar o status de arquivado.",
      });
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-5 pb-3">
        {project.imageUrl && (
          <AspectRatio
            ratio={16 / 9}
            className="mb-4 overflow-hidden rounded-md border bg-muted"
          >
            <img
              src={project.imageUrl}
              alt={project.title}
              className="h-full w-full object-cover"
            />
          </AspectRatio>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  !project.color && "bg-muted-foreground"
                )}
                style={
                  project.color ? { backgroundColor: project.color } : undefined
                }
              />
              <h2 className="min-w-0 text-base font-semibold leading-6">
                <Link
                  to={`/tasks/project/${project.id}`}
                  className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-md:inline-flex max-md:min-h-10 max-md:items-center"
                >
                  {project.title}
                </Link>
              </h2>
            </div>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-8 md:w-8"
              onClick={handleToggleFavorite}
              aria-pressed={project.favorite}
              aria-label="Favoritar"
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  project.favorite
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                )}
                aria-hidden
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8"
                  aria-label={`Ações do projeto: ${project.title}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  <UploadCloud className="mr-2 h-4 w-4" aria-hidden />
                  <span>
                    {project.imageUrl ? "Trocar imagem" : "Adicionar imagem"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleArchive}>
                  {project.archived ? (
                    <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  <span>{project.archived ? "Desarquivar" : "Arquivar"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(project.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  <span>Excluir</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-5 pt-0">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="tabular-nums">{project.progress}%</span>
          </div>
          <Progress
            value={project.progress}
            className="h-2"
            aria-label={`Progresso: ${project.progress}%`}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {objectivesCountLabel(
              completedObjectivesCount,
              project.objectives.length
            )}
          </p>
        </div>

        <div className="mt-4 flex-1">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            Próximos objetivos
          </h3>

          {nextObjectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum objetivo pendente.
            </p>
          ) : (
            <ul className="space-y-1">
              {nextObjectives.map(({ objective, index }) => (
                <ObjectiveItem
                  key={`${index}-${objective.title}`}
                  objective={objective}
                  index={index}
                  onToggleStatus={handleToggleStatus}
                  isUpdating={isUpdating === index}
                />
              ))}
            </ul>
          )}

          {hasMoreObjectives && (
            <Button asChild variant="link" className="mt-1 h-auto p-0">
              <Link to={`/tasks/project/${project.id}`}>Ver todos</Link>
            </Button>
          )}
        </div>
      </CardContent>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        disabled={isUploadingImage}
      />
    </Card>
  );
}

