import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { useSidebarProjects } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { TaskDTO, Status, Priority } from "@/types/task";
import { ProjectDTO } from "@/types/project";
import { getAllTasks, TaskFilters } from "@/services/taskService";
import {
  archiveProject,
  getAllProjects,
  ProjectFilters,
  toggleFavoriteProject,
  unarchiveProject,
} from "@/services/projectService";
import {
  TasksDataTable,
  TasksFilters,
} from "@/components/all-data/TasksDataTable";
import {
  ProjectsDataTable,
  ProjectsFilters,
} from "@/components/all-data/ProjectsDataTable";

const INITIAL_TASK_FILTERS: TasksFilters = {
  status: "all",
  priority: "all",
  searchQuery: "",
  startDate: undefined,
  endDate: undefined,
};

export default function AllDataPage() {
  const { userId } = useAuth();
  const { refreshSidebarProjects } = useSidebarProjects();
  const [searchParams, setSearchParams] = useSearchParams();

  // §11.7: abas e filtro de arquivados vivem na URL para permitir o link
  // "Ver arquivados" de /projects.
  const activeTab =
    searchParams.get("tab") === "projects" ? "projects" : "tasks";
  const includeArchived = searchParams.get("archived") === "1";

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [taskPagination, setTaskPagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskFilters, setTaskFilters] =
    useState<TasksFilters>(INITIAL_TASK_FILTERS);

  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectPagination, setProjectPagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  const loadTasks = useCallback(
    async (page: number, filters: TasksFilters) => {
      if (!userId) return;

      setIsLoadingTasks(true);
      try {
        const apiParams: TaskFilters = {
          page,
          size: 20,
          sortBy: "dueDate",
          direction: "DESC",
        };

        if (filters.status !== "all") {
          apiParams.status = filters.status as Status;
        }

        if (filters.priority !== "all") {
          apiParams.priority = filters.priority as Priority;
        }

        if (filters.searchQuery) {
          apiParams.search = filters.searchQuery;
        }

        if (filters.startDate) {
          apiParams.startDate = format(filters.startDate, "yyyy-MM-dd");
        }

        if (filters.endDate) {
          apiParams.endDate = format(filters.endDate, "yyyy-MM-dd");
        }

        const response = await getAllTasks(userId, apiParams);
        setTasks(response.content);
        setTaskPagination({
          page: response.number,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
        });
      } catch (error) {
        toast.error("Erro ao carregar tarefas", {
          description:
            error.response?.data?.message ||
            "Não foi possível carregar as tarefas.",
        });
      } finally {
        setIsLoadingTasks(false);
      }
    },
    [userId]
  );

  const loadProjects = useCallback(
    async (page: number, filters: ProjectsFilters) => {
      if (!userId) return;

      setIsLoadingProjects(true);
      try {
        const apiParams: ProjectFilters = {
          page,
          size: 20,
          sortBy: "id",
          direction: "DESC",
          includeArchived: filters.includeArchived,
        };

        if (filters.searchQuery) {
          apiParams.search = filters.searchQuery;
        }

        const response = await getAllProjects(userId, apiParams);
        setProjects(response.content);
        setProjectPagination({
          page: response.number,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
        });
      } catch (error) {
        toast.error("Erro ao carregar projetos", {
          description:
            error.response?.data?.message ||
            "Não foi possível carregar os projetos.",
        });
      } finally {
        setIsLoadingProjects(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadTasks(0, INITIAL_TASK_FILTERS);
  }, [loadTasks]);

  // A URL é a fonte da verdade de `archived`; a busca é estado local.
  useEffect(() => {
    void loadProjects(0, { includeArchived, searchQuery: projectSearchQuery });
  }, [loadProjects, includeArchived, projectSearchQuery]);

  const handleTabChange = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("tab", value === "projects" ? "projects" : "tasks");
        if (value !== "projects") {
          next.delete("archived");
        }
        return next;
      },
      { replace: true }
    );
  };

  const handleTaskFilterChange = (filterUpdates: Partial<TasksFilters>) => {
    const newFilters = { ...taskFilters, ...filterUpdates };
    setTaskFilters(newFilters);

    // If changing dates, wait for both to be set
    const isDateUpdate =
      "startDate" in filterUpdates || "endDate" in filterUpdates;
    if (isDateUpdate) {
      const hasStartDate = newFilters.startDate !== undefined;
      const hasEndDate = newFilters.endDate !== undefined;

      // Only reload if both dates are set or both are cleared
      if ((hasStartDate && hasEndDate) || (!hasStartDate && !hasEndDate)) {
        void loadTasks(0, newFilters);
      }
    } else {
      void loadTasks(0, newFilters);
    }
  };

  const handleTaskPageChange = (page: number) => {
    void loadTasks(page, taskFilters);
  };

  const handleProjectFilterChange = (filterUpdates: Partial<ProjectsFilters>) => {
    if ("searchQuery" in filterUpdates) {
      setProjectSearchQuery(filterUpdates.searchQuery ?? "");
    }

    if ("includeArchived" in filterUpdates) {
      const nextArchived = Boolean(filterUpdates.includeArchived);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("tab", "projects");
          if (nextArchived) {
            next.set("archived", "1");
          } else {
            next.delete("archived");
          }
          return next;
        },
        { replace: true }
      );
    }
  };

  const handleProjectPageChange = (page: number) => {
    void loadProjects(page, { includeArchived, searchQuery: projectSearchQuery });
  };

  const handleArchiveProject = async (id: number) => {
    try {
      await archiveProject(id);
      toast.success("Sucesso", {
        description: "Projeto arquivado com sucesso.",
      });
      void loadProjects(projectPagination.page, {
        includeArchived,
        searchQuery: projectSearchQuery,
      });
      refreshSidebarProjects();
    } catch (error) {
      toast.error("Erro ao arquivar", {
        description: error.response?.data?.message || "Erro inesperado.",
      });
    }
  };

  const handleUnarchiveProject = async (id: number) => {
    try {
      await unarchiveProject(id);
      toast.success("Sucesso", {
        description: "Projeto desarquivado com sucesso.",
      });
      void loadProjects(projectPagination.page, {
        includeArchived,
        searchQuery: projectSearchQuery,
      });
      refreshSidebarProjects();
    } catch (error) {
      toast.error("Erro ao desarquivar", {
        description: error.response?.data?.message || "Erro inesperado.",
      });
    }
  };

  const handleToggleFavoriteProject = async (id: number) => {
    try {
      await toggleFavoriteProject(id);
      void loadProjects(projectPagination.page, {
        includeArchived,
        searchQuery: projectSearchQuery,
      });
      refreshSidebarProjects();
    } catch (error) {
      toast.error("Erro ao favoritar", {
        description: error.response?.data?.message || "Erro inesperado.",
      });
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex max-w-[1280px] flex-col gap-6">
        <PageHeader
          title="Todos os dados"
          description="Visualize todas as suas tarefas e projetos em um só lugar."
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <TasksDataTable
              tasks={tasks}
              isLoading={isLoadingTasks}
              pagination={taskPagination}
              onPageChange={handleTaskPageChange}
              filters={taskFilters}
              onFilterChange={handleTaskFilterChange}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsDataTable
              projects={projects}
              isLoading={isLoadingProjects}
              pagination={projectPagination}
              onPageChange={handleProjectPageChange}
              filters={{ includeArchived, searchQuery: projectSearchQuery }}
              onFilterChange={handleProjectFilterChange}
              onArchive={handleArchiveProject}
              onUnarchive={handleUnarchiveProject}
              onToggleFavorite={handleToggleFavoriteProject}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
