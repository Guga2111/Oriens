import { useState, useRef, ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  UploadCloud,
  Target,
  Calendar,
  Star,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/useSound";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ObjectiveDTO {
  title: string;
  dueDate?: string;
  status: "PENDING" | "CONCLUDED";
}

export interface ProjectDTO {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  progress: number;
  totalObjectives: number;
  objectives: ObjectiveDTO[];
  favorite: boolean;
  archived: boolean;
}

interface ProjectCardProps {
  project: ProjectDTO;
  onEdit: (project: ProjectDTO) => void;
  onDelete: (projectId: number) => void;
  onProjectUpdate: (updatedProject: ProjectDTO) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onProjectUpdate,
}: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isObjectivesExpanded, setIsObjectivesExpanded] = useState(false);

  const playConcludedSound = useSound("/concluding-sound.wav");

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialObjectives = project.objectives.slice(0, 2);
  const remainingObjectives = project.objectives.slice(2);
  const completedObjectivesCount = project.objectives.filter(
    (o) => o.status === "CONCLUDED"
  ).length;

  console.log(project);

  const handleToggleStatus = async (objectiveIndex: number) => {
    setIsUpdating(objectiveIndex);
    const objective = project.objectives[objectiveIndex];
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

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
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

      const updatedProject = {
        ...project,
        imageUrl: response.data.projectImageUrl,
      };
      onProjectUpdate(updatedProject);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a imagem.",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleToggleFavorite = async (event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/favorite`
      );
      onProjectUpdate(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status de favorito.",
      });
    }
  };

  const handleArchiveProject = async (event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/archive`
      );
      onProjectUpdate(response.data);

      toast({
        title: response.data.archived
          ? "Projeto arquivado!"
          : "Projeto desarquivado.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível arquivar.",
      });
    }
  };

  const ObjectiveItem = ({
    objective,
    index,
  }: {
    objective: ObjectiveDTO;
    index: number;
  }) => (
    <Card>
      <div className="flex items-start gap-2 p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full flex-shrink-0"
          onClick={() => handleToggleStatus(index)}
          disabled={isUpdating === index}
        >
          {isUpdating === index ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : objective.status === "CONCLUDED" ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        <div className="space-y-1 md:space-y-2">
          <span
            className={cn(
              "text-sm",
              objective.status === "CONCLUDED" &&
              "line-through text-muted-foreground"
            )}
          >
            {objective.title}
          </span>

          {objective.dueDate && (
            <p className="text-xs text-muted-foreground flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              {format(new Date(objective.dueDate), "P", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <div className="relative mb-4">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-background/50 hover:bg-background/80 rounded-full"
              onClick={handleToggleFavorite}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  project.favorite
                    ? "text-yellow-500 fill-yellow-400"
                    : "text-muted-foreground hover:text-yellow-500"
                )}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-background/50 hover:bg-background/80 rounded-full"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer"
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  <span>Trocar Foto</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit(project)}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleArchiveProject}
                  className="cursor-pointer"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Arquivar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(project.id)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Deletar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt={project.title}
              className="h-40 w-full object-cover rounded-md"
            />
          ) : (
            <div
              className="h-40 bg-muted rounded-md flex items-center justify-center relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingImage ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <UploadCloud className="h-8 w-8 text-white" />
                    <span className="text-sm text-white mt-1">
                      Enviar imagem
                    </span>
                  </div>

                  <span className="text-muted-foreground text-sm group-hover:opacity-0 transition-opacity">
                    Sem imagem
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between items-start">
          <div className="space-y-1 md:space-y-2">
            <CardTitle>{project.title}</CardTitle>
            <CardDescription>{project.description}</CardDescription>
          </div>
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: project.color || "#ccc" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span>{project.progress}%</span>
          </div>
          <Progress
            value={project.progress}
            className="[&>[role='progressbar']]:bg-none [&>[role='progressbar']]:bg-[var(--gradient-primary)]"
          />
        </div>
        <div>
          <div>
            <h4 className="font-medium text-foreground mb-2 text-sm flex items-center">
              <Target className="mr-2 h-4 w-4 text-primary" />
              Objetivos ({completedObjectivesCount}/{project.totalObjectives})
            </h4>
          </div>

          <div className="space-y-2">
            {initialObjectives.map((obj, index) => (
              <ObjectiveItem key={index} objective={obj} index={index} />
            ))}
          </div>
        </div>

        {remainingObjectives.length > 0 && (
          <Collapsible
            className="mt-2"
            open={isObjectivesExpanded}
            onOpenChange={setIsObjectivesExpanded}
          >
            <CollapsibleContent className="space-y-2">
              {remainingObjectives.map((obj, index) => (
                <ObjectiveItem
                  key={index}
                  objective={obj}
                  index={initialObjectives.length + index}
                />
              ))}
            </CollapsibleContent>
            <CollapsibleTrigger asChild className="">
              <Button
                variant="link"
                className="p-0 h-auto mt-2 text-sm text-primary"
              >
                {isObjectivesExpanded
                  ? "Ver menos"
                  : `Ver mais ${remainingObjectives.length} objetivo${remainingObjectives.length > 1 ? 's' : ''}`
                }
                <ChevronDown className={cn(
                  "h-4 w-4 ml-1 transition-transform duration-200",
                  isObjectivesExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
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
