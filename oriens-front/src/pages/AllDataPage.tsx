import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/common/PageHeader';
import { useSidebarProjects } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { TaskDTO, ProjectDTO, Status, Priority } from '@/types/task';
import { getAllTasks, TaskFilters } from '@/services/taskService';
import { archiveProject, getAllProjects, ProjectFilters, toggleFavoriteProject, unarchiveProject } from '@/services/projectService';
import { TasksDataTable, TasksFilters } from '@/components/all-data/TasksDataTable';
import { ProjectsDataTable, ProjectsFilters } from '@/components/all-data/ProjectsDataTable';

export default function AllDataPage() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const { refreshSidebarProjects } = useSidebarProjects();

  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>('tasks');

  // Tasks state
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [taskPagination, setTaskPagination] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskFilters, setTaskFilters] = useState<TasksFilters>({
    status: 'all',
    priority: 'all',
    searchQuery: '',
    startDate: undefined,
    endDate: undefined,
  });

  // Projects state
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectPagination, setProjectPagination] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectFilters, setProjectFilters] = useState<ProjectsFilters>({
    includeArchived: false,
    searchQuery: '',
  });

  // Load tasks on mount and when filters change
  useEffect(() => {
    if (userId) {
      loadTasks(0, taskFilters);
    }
  }, [userId]);

  // Load projects on mount and when filters change
  useEffect(() => {
    if (userId) {
      loadProjects(0, projectFilters);
    }
  }, [userId]);

  const loadTasks = async (page: number = 0, filters: TasksFilters = taskFilters) => {
    setIsLoadingTasks(true);
    try {
      const apiParams: TaskFilters = {
        page,
        size: 20,
        sortBy: 'dueDate',
        direction: 'DESC',
      };

      if (filters.status !== 'all') {
        apiParams.status = filters.status as Status;
      }

      if (filters.priority !== 'all') {
        apiParams.priority = filters.priority as Priority;
      }

      if (filters.searchQuery) {
        apiParams.search = filters.searchQuery;
      }

      if (filters.startDate) {
        apiParams.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }

      if (filters.endDate) {
        apiParams.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }

      const response = await getAllTasks(userId!, apiParams);
      setTasks(response.content);
      setTaskPagination({
        page: response.number,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar tarefas',
        description: error.response?.data?.message || 'Não foi possível carregar as tarefas.',
      });
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const loadProjects = async (page: number = 0, filters: ProjectsFilters = projectFilters) => {
    setIsLoadingProjects(true);
    try {
      const apiParams: ProjectFilters = {
        page,
        size: 20,
        sortBy: 'id',
        direction: 'DESC',
        includeArchived: filters.includeArchived,
      };

      if (filters.searchQuery) {
        apiParams.search = filters.searchQuery;
      }

      const response = await getAllProjects(userId!, apiParams);
      setProjects(response.content);
      setProjectPagination({
        page: response.number,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar projetos',
        description: error.response?.data?.message || 'Não foi possível carregar os projetos.',
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleTaskFilterChange = (filterUpdates: Partial<TasksFilters>) => {
    const newFilters = { ...taskFilters, ...filterUpdates };
    setTaskFilters(newFilters);

    // If changing dates, wait for both to be set
    const isDateUpdate = 'startDate' in filterUpdates || 'endDate' in filterUpdates;
    if (isDateUpdate) {
      const hasStartDate = newFilters.startDate !== undefined;
      const hasEndDate = newFilters.endDate !== undefined;

      // Only reload if both dates are set or both are cleared
      if ((hasStartDate && hasEndDate) || (!hasStartDate && !hasEndDate)) {
        loadTasks(0, newFilters);
      }
    } else {
      loadTasks(0, newFilters);
    }
  };

  const handleTaskPageChange = (page: number) => {
    loadTasks(page, taskFilters);
  };

  const handleProjectFilterChange = (filterUpdates: Partial<ProjectsFilters>) => {
    const newFilters = { ...projectFilters, ...filterUpdates };
    setProjectFilters(newFilters);
    loadProjects(0, newFilters);
  };

  const handleProjectPageChange = (page: number) => {
    loadProjects(page, projectFilters);
  };

  const handleArchiveProject = async (id: number) => {
    try {
      await archiveProject(id);
      toast({
        title: "Sucesso",
        description: "Projeto arquivado com sucesso.",
      });
      // Recarrega a página atual para refletir a mudança
      loadProjects(projectPagination.page, projectFilters);
      refreshSidebarProjects();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao arquivar',
        description: error.response?.data?.message || 'Erro inesperado.',
      });
    }
  };

  const handleUnarchiveProject = async (id: number) => {
    try {
      await unarchiveProject(id);
      toast({
        title: "Sucesso",
        description: "Projeto desarquivado com sucesso.",
      });
      loadProjects(projectPagination.page, projectFilters);
      refreshSidebarProjects();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao desarquivar',
        description: error.response?.data?.message || 'Erro inesperado.',
      });
    }
  };

  const handleToggleFavoriteProject = async (id: number) => {
    try {
      await toggleFavoriteProject(id); 
      console.log("Toggle favorite para:", id);
      loadProjects(projectPagination.page, projectFilters);
      refreshSidebarProjects();
    } catch (error) {
        toast({
        variant: 'destructive',
        title: 'Erro ao favoritar',
        description: error.response?.data?.message || 'Erro inesperado.',
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <PageHeader
          title="Todos os Dados"
          description="Visualize todas as suas tarefas e projetos em um só lugar"
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tasks' | 'projects')}>
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
              filters={projectFilters}
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
