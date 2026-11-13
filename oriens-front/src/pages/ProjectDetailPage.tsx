import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Calendar as CalendarIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ObjectiveItem } from "@/components/projects/ObjectiveItem";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebarProjects } from "@/components/layout/AppLayout";
import {
  formatDue,
  formatDueDistance,
  parseLocalDate,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api";
import { useSound } from "@/hooks/useSound";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ObjectiveDTO, ProjectDTO } from "@/types/project";

interface IndexedObjective {
  objective: ObjectiveDTO;
  index: number;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playConcludedSound = useSound("/concluding-sound.wav");
  const { refreshSidebarProjects } = useSidebarProjects();

  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);

  const [newObjectiveTitle, setNewObjectiveTitle] = useState("");
  const [isSubmittingObjective, setIsSubmittingObjective] = useState(false);

  const [updatingObjective, setUpdatingObjective] = useState<number | null>(
    null
  );
  const [objectiveToDelete, setObjectiveToDelete] = useState<number | null>(
    null
  );

  const [isEditObjectiveDialogOpen, setIsEditObjectiveDialogOpen] =
    useState(false);
  const [objectiveToEditIndex, setObjectiveToEditIndex] = useState<
    number | null
  >(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchProject = async (silent = false) => {
    if (!id) return;
    if (!silent) setIsLoading(true);

    try {
      const response = await apiClient.get<ProjectDTO>(`/project/${id}`);
      setProject(response.data);
    } catch {
      setProject(null);
      toast.error("Erro", {
        description: "Projeto não encontrado ou você não tem permissão.",
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProject();
  }, [id]);

  const stats = useMemo(() => {
    const objectives = project?.objectives ?? [];
    const pending: IndexedObjective[] = [];
    const concluded: IndexedObjective[] = [];
    const dueDates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdue = 0;
    let nextDeadline: Date | null = null;

    objectives.forEach((objective, index) => {
      const indexed = { objective, index };
      if (objective.status === "CONCLUDED") {
        concluded.push(indexed);
      } else {
        pending.push(indexed);
      }

      const due = parseLocalDate(objective.dueDate);
      if (!due) return;
      dueDates.push(due);

      if (objective.status === "CONCLUDED") return;

      if (due < today) {
        overdue += 1;
      } else if (!nextDeadline || due < nextDeadline) {
        nextDeadline = due;
      }
    });

    return { pending, concluded, dueDates, overdue, nextDeadline };
  }, [project]);

  const handleToggleObjectiveStatus = async (objectiveIndex: number) => {
    if (!project) return;

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
      toast.success("Status do objetivo atualizado.");

      if (newStatus === "CONCLUDED") {
        playConcludedSound();
      }
    } catch {
      toast.error("Erro", {
        description: "Não foi possível atualizar o objetivo.",
      });
    } finally {
      setUpdatingObjective(null);
    }
  };

  const handleAddObjective = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newObjectiveTitle.trim() || !project) return;

    setIsSubmittingObjective(true);
    try {
      const response = await apiClient.post<ProjectDTO>(
        `/project/${project.id}/objective`,
        { title: newObjectiveTitle.trim(), status: "PENDING" }
      );
      setProject(response.data);
      setNewObjectiveTitle("");
      toast.success("Objetivo adicionado.");
    } catch {
      toast.error("Erro", {
        description: "Não foi possível adicionar o objetivo.",
      });
    } finally {
      setIsSubmittingObjective(false);
    }
  };

  const handleOpenEditObjectiveDialog = (objectiveIndex: number) => {
    if (!project) return;

    const objective = project.objectives[objectiveIndex];
    if (!objective) return;

    setObjectiveToEditIndex(objectiveIndex);
    setEditTitle(objective.title);
    setEditDueDate(parseLocalDate(objective.dueDate));
    setIsEditObjectiveDialogOpen(true);
  };

  const handleSubmitEditObjective = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project || objectiveToEditIndex === null || !editTitle.trim()) return;

    setIsSubmittingEdit(true);

    const originalObjective = project.objectives[objectiveToEditIndex];
    const dueDate = editDueDate
      ? new Date(
          Date.UTC(
            editDueDate.getFullYear(),
            editDueDate.getMonth(),
            editDueDate.getDate()
          )
        ).toISOString()
      : undefined;

    try {
      const response = await apiClient.put<ProjectDTO>(
        `/project/${project.id}/objective/${objectiveToEditIndex}`,
        {
          ...originalObjective,
          title: editTitle.trim(),
          dueDate,
        }
      );
      setProject(response.data);
      toast.success("Objetivo atualizado.");
      setIsEditObjectiveDialogOpen(false);
      setObjectiveToEditIndex(null);
    } catch {
      toast.error("Erro", {
        description: "Não foi possível atualizar o objetivo.",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteObjective = async () => {
    if (!project || objectiveToDelete === null) return;

    try {
      await apiClient.delete(
        `/project/${project.id}/objective/${objectiveToDelete}`
      );
      // Sem recalcular progresso no front (D10): busca o projeto atualizado.
      await fetchProject(true);
      toast.success("Objetivo excluído.");
    } catch {
      toast.error("Erro", {
        description: "Não foi possível excluir o objetivo.",
      });
    } finally {
      setObjectiveToDelete(null);
    }
  };

  const handleToggleFavorite = async () => {
    if (!project) return;

    try {
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/favorite`
      );
      setProject(response.data);
      refreshSidebarProjects();
    } catch {
      toast.error("Erro", {
        description: "Não foi possível alterar o status de favorito.",
      });
    }
  };

  const handleToggleArchive = async () => {
    if (!project) return;

    try {
      const action = project.archived ? "unarchive" : "archive";
      const response = await apiClient.patch<ProjectDTO>(
        `/project/${project.id}/${action}`
      );
      setProject(response.data);
      refreshSidebarProjects();
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

  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      await apiClient.delete(`/project/${project.id}`);
      refreshSidebarProjects();
      toast.success("Projeto excluído.");
      navigate("/projects");
    } catch {
      toast.error("Erro", {
        description: "Não foi possível excluir o projeto.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="mb-3 h-4 w-48" />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-lg lg:col-span-2" />
          <div className="space-y-6">
            <Skeleton className="h-44 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 md:p-8">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Projeto não encontrado</EmptyTitle>
            <EmptyDescription>
              Ele pode ter sido excluído ou você não tem acesso a ele.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/projects">Voltar para Projetos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const objectiveToDeleteData =
    objectiveToDelete !== null
      ? project.objectives[objectiveToDelete]
      : undefined;

  return (
    <>
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/projects">Projetos</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
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
              {project.title}
              {project.archived && <Badge variant="outline">Arquivado</Badge>}
            </span>
          }
          description={project.description}
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                aria-pressed={project.favorite}
                aria-label="Favoritar"
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    project.favorite
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  )}
                  aria-hidden
                />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" aria-hidden />
                    <span className="sr-only">Ações do projeto</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsEditProjectDialogOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden />
                    <span>Editar</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleArchive}>
                    {project.archived ? (
                      <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    <span>
                      {project.archived ? "Desarquivar" : "Arquivar"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    <span>Excluir</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">Objetivos</CardTitle>
                <CardDescription>
                  Acompanhe aqui todas as entregas do projeto.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <form
                  onSubmit={handleAddObjective}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <Input
                    placeholder="Adicionar novo objetivo..."
                    value={newObjectiveTitle}
                    onChange={(event) =>
                      setNewObjectiveTitle(event.target.value)
                    }
                    disabled={isSubmittingObjective}
                    aria-label="Novo objetivo"
                  />
                  <Button
                    type="submit"
                    disabled={
                      isSubmittingObjective || !newObjectiveTitle.trim()
                    }
                  >
                    {isSubmittingObjective ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    Adicionar
                  </Button>
                </form>

                <Tabs defaultValue="pending" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">
                      A fazer ({stats.pending.length})
                    </TabsTrigger>
                    <TabsTrigger value="concluded">
                      Concluídos ({stats.concluded.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending" className="mt-4">
                    {stats.pending.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum objetivo pendente.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {stats.pending.map(({ objective, index }) => (
                          <ObjectiveItem
                            key={`${index}-${objective.title}`}
                            objective={objective}
                            index={index}
                            onToggleStatus={handleToggleObjectiveStatus}
                            isUpdating={updatingObjective === index}
                            onEdit={handleOpenEditObjectiveDialog}
                            onDelete={setObjectiveToDelete}
                          />
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="concluded" className="mt-4">
                    {stats.concluded.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum objetivo concluído ainda.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {stats.concluded.map(({ objective, index }) => (
                          <ObjectiveItem
                            key={`${index}-${objective.title}`}
                            objective={objective}
                            index={index}
                            onToggleStatus={handleToggleObjectiveStatus}
                            isUpdating={updatingObjective === index}
                            onEdit={handleOpenEditObjectiveDialog}
                            onDelete={setObjectiveToDelete}
                          />
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium tabular-nums">
                      {project.progress}%
                    </span>
                  </div>
                  <Progress
                    value={project.progress}
                    className="h-2"
                    aria-label={`Progresso: ${project.progress}%`}
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5" aria-hidden />
                    {stats.concluded.length} de {project.objectives.length}{" "}
                    {project.objectives.length === 1 ? "objetivo" : "objetivos"}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Próximo prazo</span>
                  <span className="text-right font-medium">
                    {stats.nextDeadline
                      ? `${formatDue(stats.nextDeadline)} · ${formatDueDistance(
                          stats.nextDeadline
                        )}`
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Vencidos</span>
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      stats.overdue > 0 && "text-negative"
                    )}
                  >
                    {stats.overdue}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">Calendário</CardTitle>
                <CardDescription>
                  Datas de vencimento dos objetivos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-5 pt-0">
                <Calendar
                  mode="multiple"
                  selected={stats.dueDates}
                  locale={ptBR}
                  className="w-full p-0"
                  classNames={{
                    caption_label:
                      "text-xs font-medium xl:text-sm",
                    table: "w-full border-collapse",
                    head_row: "flex w-full",
                    head_cell:
                      "w-full flex-1 text-muted-foreground rounded-md font-normal text-[0.7rem] xl:text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-9 flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day: "h-9 w-full rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
                  }}
                />
              </CardContent>
            </Card>

            {project.imageUrl && (
              <Card>
                <CardContent className="p-4">
                  <AspectRatio
                    ratio={16 / 9}
                    className="overflow-hidden rounded-md border bg-muted"
                  >
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="h-full w-full object-cover"
                    />
                  </AspectRatio>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      <CreateProjectDialog
        open={isEditProjectDialogOpen}
        onOpenChange={setIsEditProjectDialogOpen}
        onSuccess={() => {
          void fetchProject(true);
          refreshSidebarProjects();
        }}
        projectToEdit={project}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir projeto?"
        objectName={project.title}
        confirmLabel="Excluir"
        onConfirm={handleDeleteProject}
        description={
          <>
            Excluir <strong>{project.title}</strong>? Esta ação não pode ser
            desfeita e removerá todos os objetivos do projeto.
          </>
        }
      />

      <ConfirmDialog
        open={objectiveToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setObjectiveToDelete(null);
        }}
        title="Excluir objetivo?"
        objectName={objectiveToDeleteData?.title ?? ""}
        confirmLabel="Excluir"
        onConfirm={handleDeleteObjective}
        description={
          <>
            Excluir <strong>{objectiveToDeleteData?.title}</strong>? Esta ação
            não pode ser desfeita.
          </>
        }
      />

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
                <Label htmlFor="objective-title" className="text-right">
                  Título
                </Label>
                <Input
                  id="objective-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="col-span-3"
                  disabled={isSubmittingEdit}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="objective-due-date" className="text-right">
                  Vencimento
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="objective-due-date"
                      type="button"
                      variant="outline"
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !editDueDate && "text-muted-foreground"
                      )}
                      disabled={isSubmittingEdit}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden />
                      {editDueDate ? (
                        format(editDueDate, "PPP", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editDueDate}
                      onSelect={setEditDueDate}
                      initialFocus
                      locale={ptBR}
                    />
                    {editDueDate && (
                      <div className="flex justify-end border-t border-border p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditDueDate(undefined)}
                          disabled={isSubmittingEdit}
                        >
                          Limpar data
                        </Button>
                      </div>
                    )}
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
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden
                  />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
