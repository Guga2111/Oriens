import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ProjectCard, ProjectDTO } from "@/components/projects/ProjectCard";
import { ProjectSkeleton } from "@/components/projects/ProjectSkeleton";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
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
import apiClient from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { AppHeader } from "@/components/common/AppHeader";

interface Page<T> {
  content: T[];
  last: boolean;
}

export default function ProjectsPage() {
  const { userId } = useAuth();
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const { ref, inView } = useInView({ threshold: 0.5 });

  const fetchProjects = async (pageNum: number, refresh = false) => {
    if (isLoading && !refresh) return;
    setIsLoading(true);

    try {
      const response = await apiClient.get<Page<ProjectDTO>>(
        `/project/user/${userId}?page=${pageNum}&size=6`
      );
      const data = response.data;

      setProjects((prev) =>
        refresh ? data.content : [...prev, ...data.content]
      );
      setHasMore(!data.last);
      setPage(pageNum + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os projetos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = () => {
    setPage(0);
    setProjects([]);
    fetchProjects(0, true);
  };

  useEffect(() => {
    if (userId) {
      refreshProjects();
    }
  }, [userId]);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      fetchProjects(page);
    }
  }, [inView, hasMore, isLoading]);

  const handleOpenEditDialog = (project: ProjectDTO) => {
    setEditingProject(project);
    setIsCreateDialogOpen(true);
  };

  const handleOpenDeleteDialog = (projectId: number) => {
    setProjectToDelete(projectId);
    setIsDeleteDialogOpen(true);
  };

  const handleProjectUpdate = (updatedProject: ProjectDTO) => {
    setProjects((currentProjects) =>
      currentProjects.map((p) =>
        p.id === updatedProject.id ? updatedProject : p
      )
    );
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await apiClient.delete(`/project/${projectToDelete}`);
      refreshProjects();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível deletar o projeto.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

    return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />        <main className="flex-1 flex flex-col">
          <AppHeader />

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold">Projetos</h1>
                <p className="text-muted-foreground">
                  Gerencie seus projetos e objetivos
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingProject(null);
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Projeto
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                  onProjectUpdate={handleProjectUpdate}
                />
              ))}
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <ProjectSkeleton key={`skel-${i}`} />
                ))}
            </div>

            {!isLoading && hasMore && <div ref={ref} className="h-10" />}

            {!isLoading && projects.length === 0 && (
              <div className="text-center col-span-full mt-10">
                <h3 className="text-lg font-semibold">
                  Nenhum projeto encontrado.
                </h3>
                <p className="text-muted-foreground">
                  Que tal criar o seu primeiro?
                </p>
              </div>
            )}
          </div>
        </main>

        <CreateProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={refreshProjects}
          projectToEdit={editingProject}
        />
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar
                permanentemente o projeto e todos os seus objetivos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
