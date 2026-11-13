import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectSkeleton } from "@/components/projects/ProjectSkeleton";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/context/AuthContext";
import { useSidebarProjects } from "@/components/layout/AppLayout";
import { formatDue, parseLocalDate } from "@/lib/date";
import apiClient from "@/services/api";
import type { ProjectDTO } from "@/types/project";

interface Page<T> {
  content: T[];
  last: boolean;
  totalElements?: number;
}

type ProjectFilter = "active" | "favorites";

export default function ProjectsPage() {
  const { userId } = useAuth();
  const { refreshSidebarProjects } = useSidebarProjects();

  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ProjectFilter>("active");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectDTO | null>(
    null
  );

  const { ref, inView } = useInView({ threshold: 0.5 });

  const fetchProjects = async (pageNum: number, refresh = false) => {
    if (isLoading && !refresh) return;
    setIsLoading(true);

    try {
      const response = await apiClient.get<Page<ProjectDTO>>(
        `/project/user/${userId}?page=${pageNum}&size=6`
      );
      const data = response.data;

      setProjects((previous) =>
        refresh ? data.content : [...previous, ...data.content]
      );
      if (typeof data.totalElements === "number") {
        setTotalProjects(data.totalElements);
      } else {
        setTotalProjects((count) =>
          refresh ? data.content.length : count + data.content.length
        );
      }
      setHasMore(!data.last);
      setPage(pageNum + 1);
    } catch {
      toast.error("Erro", {
        description: "Não foi possível carregar os projetos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = () => {
    setPage(0);
    setProjects([]);
    setHasMore(true);
    void fetchProjects(0, true);
    refreshSidebarProjects();
  };

  useEffect(() => {
    if (userId) {
      refreshProjects();
    }
  }, [userId]);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      void fetchProjects(page);
    }
  }, [inView, hasMore, isLoading]);

  const handleOpenEditDialog = (project: ProjectDTO) => {
    setEditingProject(project);
    setIsCreateDialogOpen(true);
  };

  const handleOpenDeleteDialog = (projectId: number) => {
    setProjectToDelete(projects.find((project) => project.id === projectId) ?? null);
    setIsDeleteDialogOpen(true);
  };

  const handleProjectUpdate = (updatedProject: ProjectDTO) => {
    setProjects((currentProjects) => {
      if (updatedProject.archived) {
        return currentProjects.filter(
          (project) => project.id !== updatedProject.id
        );
      }

      return currentProjects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      );
    });

    if (updatedProject.archived) {
      setTotalProjects((count) => Math.max(0, count - 1));
    }

    refreshSidebarProjects();
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      await apiClient.delete(`/project/${projectToDelete.id}`);
      refreshProjects();
    } catch {
      toast.error("Erro", {
        description: "Não foi possível deletar o projeto.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const visibleProjects = useMemo(
    () =>
      filter === "favorites"
        ? projects.filter((project) => project.favorite)
        : projects,
    [filter, projects]
  );

  /** Próximo vencimento entre os objetivos pendentes já carregados. */
  const nextDeadline = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next: { title: string; due: Date } | null = null;

    for (const project of projects) {
      for (const objective of project.objectives) {
        if (objective.status === "CONCLUDED") continue;

        const due = parseLocalDate(objective.dueDate);
        if (!due || due < today) continue;

        if (!next || due < next.due) {
          next = { title: objective.title, due };
        }
      }
    }

    return next;
  }, [projects]);

  const activeLabel = `${totalProjects} ${
    totalProjects === 1 ? "ativo" : "ativos"
  }`;

  return (
    <>
      <div className="p-6 md:p-8">
        <PageHeader
          title="Projetos"
          description={
            <>
              {activeLabel}
              {nextDeadline && (
                <>
                  {" "}
                  · próximo prazo: {nextDeadline.title},{" "}
                  {formatDue(nextDeadline.due)}
                </>
              )}
            </>
          }
          actions={
            <Button
              onClick={() => {
                setEditingProject(null);
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Novo projeto
            </Button>
          }
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => {
              if (value) setFilter(value as ProjectFilter);
            }}
            aria-label="Filtrar projetos"
          >
            <ToggleGroupItem value="active" aria-label="Ativos">
              Ativos
            </ToggleGroupItem>
            <ToggleGroupItem value="favorites" aria-label="Favoritos">
              Favoritos
            </ToggleGroupItem>
          </ToggleGroup>

          <Button asChild variant="link" className="h-auto p-0 text-sm">
            <Link to="/all-data?tab=projects&archived=1">Ver arquivados</Link>
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleOpenEditDialog}
              onDelete={handleOpenDeleteDialog}
              onProjectUpdate={handleProjectUpdate}
            />
          ))}
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <ProjectSkeleton key={`skeleton-${index}`} />
            ))}
        </div>

        {!isLoading && visibleProjects.length === 0 && (
          <Empty className="mt-6">
            <EmptyHeader>
              <EmptyTitle>
                {filter === "favorites" && projects.length > 0
                  ? "Nenhum projeto favorito"
                  : "Nenhum projeto ainda"}
              </EmptyTitle>
              <EmptyDescription>
                {filter === "favorites" && projects.length > 0
                  ? "Marque projetos com a estrela para encontrá-los aqui."
                  : "Crie seu primeiro projeto e acompanhe os objetivos dele."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {filter === "favorites" && projects.length > 0 ? (
                <Button variant="outline" onClick={() => setFilter("active")}>
                  Ver ativos
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setEditingProject(null);
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Criar projeto
                </Button>
              )}
            </EmptyContent>
          </Empty>
        )}

        {!isLoading && hasMore && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => void fetchProjects(page)}
              disabled={isLoading}
            >
              Carregar mais
            </Button>
          </div>
        )}
        {hasMore && <div ref={ref} className="h-4" aria-hidden />}
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={refreshProjects}
        projectToEdit={editingProject}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir projeto?"
        objectName={projectToDelete?.title ?? ""}
        confirmLabel="Excluir"
        onConfirm={handleDeleteConfirm}
        description={
          <>
            Excluir <strong>{projectToDelete?.title}</strong>? Esta ação não
            pode ser desfeita e removerá todos os objetivos do projeto.
          </>
        }
      />
    </>
  );
}
