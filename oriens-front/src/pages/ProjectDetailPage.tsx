import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

export interface ObjectiveDTO {
  id: number;
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

import apiClient from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { AppHeader } from "@/components/common/AppHeader";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/useSound";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";

import {
  Star,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  Loader2,
  Plus,
  Target,
  Edit,
  ImageIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  X,
} from "lucide-react";

interface ProjectObjectiveItemProps {
  objective: ObjectiveDTO;
  objectiveIndex: number;
  isUpdating: boolean;
  onToggleStatus: (index: number) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

function ProjectObjectiveItem({
  objective,
  objectiveIndex,
  isUpdating,
  onToggleStatus,
  onEdit,
  onDelete,
}: ProjectObjectiveItemProps) {
  const isConcluded = objective.status === "CONCLUDED";

  let formattedDueDate: string | null = null;
  if (objective.dueDate) {
    const datePart = objective.dueDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    formattedDueDate = format(localDate, "P", { locale: ptBR });
  }

  return (
    <div className="flex items-center gap-3 p-3 transition-colors rounded-lg hover:bg-muted/50">
      <Checkbox
        id={`obj-${objective.id}`}
        checked={isConcluded}
        onCheckedChange={() => onToggleStatus(objectiveIndex)}
        disabled={isUpdating}
      />
      <div className="flex-1 grid gap-1">
        <label
          htmlFor={`obj-${objective.id}`}
          className={cn(
            "text-sm font-medium leading-none cursor-pointer",
            isConcluded && "line-through text-muted-foreground"
          )}
        >
          {objective.title}
        </label>
        {objective.dueDate && (
          <p className="text-xs text-muted-foreground flex items-center">
            <CalendarIcon className="mr-1.5 h-3 w-3" />
            Vence em: {formattedDueDate}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto flex-shrink-0"
            disabled={isUpdating}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(objectiveIndex)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(objectiveIndex)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Deletar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playConcludedSound = useSound("/concluding-sound.wav");

  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newObjectiveTitle, setNewObjectiveTitle] = useState("");
  const [isSubmittingObjective, setIsSubmittingObjective] = useState(false);

  const [updatingObjective, setUpdatingObjective] = useState<number | null>(null);
  const [objectiveToDelete, setObjectiveToDelete] = useState<number | null>(null);

  const [isEditObjectiveDialogOpen, setIsEditObjectiveDialogOpen] =
    useState(false);
  const [objectiveToEdit, setObjectiveToEdit] = useState<ObjectiveDTO | null>(
    null
  );
  const [objectiveToEditIndex, setObjectiveToEditIndex] = useState<number | null>(
    null
  );
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchProject = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get<ProjectDTO>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Projeto não encontrado ou você não tem permissão.",
      });
      navigate("/projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

const { pendingCount, concludedCount, objectiveDueDates } =
    useMemo(() => {
      const objectives = project?.objectives || [];
      let pending = 0;
      let concluded = 0;
      const dueDates: Date[] = [];

      objectives.forEach((o) => {
        if (o.status === "CONCLUDED") {
          concluded++;
        } else {
          pending++;
        }
        if (o.dueDate) {
          const datePart = o.dueDate.split('T')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          dueDates.push(new Date(year, month - 1, day));
        }
      });

      return {
        pendingCount: pending,
        concludedCount: concluded,
        objectiveDueDates: dueDates,
      };
    }, [project]);

  const handleToggleObjectiveStatus = async (objectiveIndex: number) => {
    if (
      !project ||
      objectiveIndex < 0 ||
      objectiveIndex >= project.objectives.length
    )
      return;

    const objective = project.objectives[objectiveIndex];
    if (!objective) return;

    setUpdatingObjective(objectiveIndex);
    const newStatus =
      objective.status === "CONCLUDED" ? "PENDING" : "CONCLUDED";

    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/objective/${objectiveIndex}`,
        { status: newStatus }
      );
      setProject(response.data);
      toast({ title: "Status do objetivo atualizado!" });
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
      setUpdatingObjective(null);
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveTitle.trim() || !project) return;

    setIsSubmittingObjective(true);
    try {
      const response = await apiClient.post<ProjectDTO>(
        `/project/${project.id}/objective`,
        { title: newObjectiveTitle, status: "PENDING" }
      );
      setProject(response.data);
      setNewObjectiveTitle("");
      toast({ title: "Objetivo adicionado!" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o objetivo.",
      });
    } finally {
      setIsSubmittingObjective(false);
    }
  };

  const handleOpenEditObjectiveDialog = (objectiveIndex: number) => {
    if (
      !project ||
      objectiveIndex < 0 ||
      objectiveIndex >= project.objectives.length
    )
      return;

    const objective = project.objectives[objectiveIndex];
    if (objective) {
      setObjectiveToEdit(objective);
      setObjectiveToEditIndex(objectiveIndex);
      setEditTitle(objective.title);
      let localDueDate: Date | undefined = undefined;
      if (objective.dueDate) {
        const datePart = objective.dueDate.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        localDueDate = new Date(year, month - 1, day); 
      }
      setEditDueDate(localDueDate);
      setIsEditObjectiveDialogOpen(true);
    }
  };

  const handleSubmitEditObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || objectiveToEditIndex === null || !editTitle.trim()) return;

    setIsSubmittingEdit(true);

    const originalObjective = project.objectives[objectiveToEditIndex];
    let utcDueDate: string | undefined = undefined;
    if (editDueDate) {
      const utcDate = new Date(Date.UTC(
        editDueDate.getFullYear(),
        editDueDate.getMonth(),
        editDueDate.getDate()
      ));
      utcDueDate = utcDate.toISOString(); 
    }
    const updatedObjective = {
      ...originalObjective,
      title: editTitle.trim(),
      dueDate: utcDueDate,
    };

    try {
      const response = await apiClient.put<ProjectDTO>(
        `/project/${project.id}/objective/${objectiveToEditIndex}`,
        updatedObjective
      );
      setProject(response.data);
      toast({ title: "Objetivo atualizado!" });
      setIsEditObjectiveDialogOpen(false);
      setObjectiveToEdit(null);
      setObjectiveToEditIndex(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o objetivo.",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenDeleteObjectiveDialog = (objectiveIndex: number) => {
    if (
      project === null ||
      objectiveIndex < 0 ||
      objectiveIndex >= project.objectives.length
    )
      return;

    const objective = project.objectives[objectiveIndex];
    if (objective) {
      setObjectiveToDelete(objectiveIndex);
    }
  };

  const handleDeleteObjective = async () => {
    if (project === null || objectiveToDelete === null) return;

    const objectiveIndexToDelete = objectiveToDelete;

    try {
      await apiClient.delete(
        `/project/${project.id}/objective/${objectiveIndexToDelete}`
      );
      
      setProject((prevProject) => {
        if (!prevProject) return null;
        
        const newObjectives = [...prevProject.objectives];
        newObjectives.splice(objectiveIndexToDelete, 1);
        
        const newConcludedCount = newObjectives.filter(
          (o) => o.status === "CONCLUDED"
        ).length;
        const newTotalCount = newObjectives.length;
        const newProgress =
          newTotalCount > 0 ? (newConcludedCount / newTotalCount) * 100 : 0;

        return {
          ...prevProject,
          objectives: newObjectives,
          totalObjectives: newTotalCount,
          progress: newProgress,
        };
      });

      toast({ title: "Objetivo deletado!" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível deletar o objetivo.",
      });
    } finally {
      setObjectiveToDelete(null);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project) return;

    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/favorite`
      );
      setProject(response.data);
      toast({
        title: response.data.favorite
          ? "Projeto favoritado!"
          : "Projeto desfavoritado.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status de favorito.",
      });
    }
  };

  const handleArchiveProject = async () => {
    if (!project) return;
    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/archive`
      );
      setProject(response.data);
      toast({
        title: response.data.archived
          ? "Projeto arquivado!"
          : "Projeto desarquivado.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status de arquivado.",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await apiClient.delete(`/project/${project.id}`);
      toast({ title: "Sucesso!", description: "Projeto deletado." });
      navigate("/projects");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível deletar o projeto.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full bg-gray-50/50 dark:bg-background">
          <AppSidebar />
          <main className="flex-1 flex flex-col h-screen">
            <AppHeader />
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Skeleton className="h-9 w-64 mb-2" />
                  <Skeleton className="h-5 w-96" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-80 w-full rounded-lg" />
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-72 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!project) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full bg-gray-50/50 dark:bg-background">
          <AppSidebar />
          <main className="flex-1 flex flex-col h-screen">
            <AppHeader />
            <div className="flex-1 flex items-center justify-center">
              <p>Projeto não encontrado.</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50/50 dark:bg-background">
        <AppSidebar />

        <main className="flex-1 flex flex-col h-screen">
          <AppHeader />

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/projects")}
                  className="mb-2 text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar para Projetos
                </Button>
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color || "#ccc" }}
                  />
                  <h1 className="text-3xl font-bold">{project.title}</h1>
                  {project.archived && (
                    <Badge variant="outline">Arquivado</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  {project.description}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
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
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Editar Projeto</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleArchiveProject}>
                      <Archive className="mr-2 h-4 w-4" />
                      <span>
                        {project.archived ? "Desarquivar" : "Arquivar"}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Deletar Projeto</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AspectRatio
                  ratio={16 / 9}
                  className="bg-muted rounded-lg overflow-hidden border"
                >
                  {project.imageUrl ? (
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-16 w-16" />
                      <span className="mt-2 text-sm">Sem imagem</span>
                    </div>
                  )}
                </AspectRatio>

                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Objetivos</CardTitle>
                    <CardDescription>
                      Acompanhe aqui todas as entregas do projeto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleAddObjective}
                      className="flex gap-2 mb-4"
                    >
                      <Input
                        placeholder="Adicionar novo objetivo..."
                        value={newObjectiveTitle}
                        onChange={(e) => setNewObjectiveTitle(e.target.value)}
                        disabled={isSubmittingObjective}
                      />
                      <Button type="submit" disabled={isSubmittingObjective}>
                        {isSubmittingObjective ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </form>

                    <Tabs defaultValue="pending">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">
                          A Fazer ({pendingCount})
                        </TabsTrigger>
                        <TabsTrigger value="concluded">
                          Concluídos ({concludedCount})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="pending" className="mt-4 space-y-1">
                        {pendingCount === 0 ? (
                          <p className="text-muted-foreground text-sm text-center p-4">
                            Nenhum objetivo pendente.
                          </p>
                        ) : (
                          project.objectives.map((obj, index) => {

                            if (obj.status === "CONCLUDED") return null;

                            return (
                              <ProjectObjectiveItem
                                key={obj.id}
                                objective={obj}
                                objectiveIndex={index}
                                isUpdating={updatingObjective === index}
                                onToggleStatus={handleToggleObjectiveStatus}
                                onEdit={handleOpenEditObjectiveDialog}
                                onDelete={handleOpenDeleteObjectiveDialog}
                              />
                            );
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="concluded" className="mt-4 space-y-1">
                        {concludedCount === 0 ? (
                          <p className="text-muted-foreground text-sm text-center p-4">
                            Nenhum objetivo concluído ainda.
                          </p>
                        ) : (
                          project.objectives.map((obj, index) => {
                            
                            if (obj.status !== "CONCLUDED") return null;

                            return (
                              <ProjectObjectiveItem
                                key={obj.id}
                                objective={obj}
                                objectiveIndex={index} 
                                isUpdating={updatingObjective === index}
                                onToggleStatus={handleToggleObjectiveStatus}
                                onEdit={handleOpenEditObjectiveDialog}
                                onDelete={handleOpenDeleteObjectiveDialog}
                              />
                            );
                          })
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Progresso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Concluído</span>
                      <span className="font-medium">
                        {project.progress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={project.progress}
                      className="[&>[role='progressbar']]:bg-none [&>[role='progressbar']]:bg-[var(--gradient-primary)]"
                    />
                    <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center">
                      <Target className="h-4 w-4 mr-2 text-primary" />
                      {concludedCount} de {project.totalObjectives}{" "} 
                      objetivos completos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Datas Importantes</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Calendar
                      mode="multiple"
                      selected={objectiveDueDates}
                      locale={ptBR}
                      className="p-0"
                      classNames={{
                        day_selected:
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar
              permanentemente o projeto **{project.title}** e todos os seus
              objetivos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={objectiveToDelete !== null}
        onOpenChange={(open) => !open && setObjectiveToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que quer deletar o objetivo:{" "}
              <strong>
                "
                {objectiveToDelete !== null && project
                  ? project.objectives[objectiveToDelete]?.title
                  : ""}
                "
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteObjective}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isEditObjectiveDialogOpen}
        onOpenChange={setIsEditObjectiveDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Objetivo</DialogTitle>
            <DialogDescription>
              Altere o título ou a data de vencimento do seu objetivo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEditObjective}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Título
                </Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="col-span-3"
                  disabled={isSubmittingEdit}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Vencimento
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !editDueDate && "text-muted-foreground"
                      )}
                      disabled={isSubmittingEdit}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDueDate ? (
                        format(editDueDate, "PPP", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  {editDueDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-12 top-[125px] h-8 w-8"
                      onClick={() => setEditDueDate(undefined)}
                      disabled={isSubmittingEdit}
                    >
                      
                    </Button>
                  )}
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editDueDate}
                      onSelect={setEditDueDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmittingEdit}
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingEdit}>
                {isSubmittingEdit && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}