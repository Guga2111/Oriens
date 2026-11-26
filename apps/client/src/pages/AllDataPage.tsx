import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useSidebarProjects } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TasksDataTable, type TaskSortField } from "@/components/all-data/TasksDataTable";
import { ProjectsDataTable, type ProjectsFilters, type ProjectSortField } from "@/components/all-data/ProjectsDataTable";
import type { ExploreOrder } from "@/components/all-data/ExploreSort";
import { useAllTasks, useProjectFlags, useWorkProjects } from "@/hooks/useWork";
import { taskFilterQuery, type TaskFilters } from "@/lib/task-filters";
import type { WorkProject } from "@/types/work";

const PAGE_SIZE = 20;
const EMPTY_TASK_FILTERS: TaskFilters = {};

function pagination(data: { totalPages: number; totalElements: number } | undefined, page: number) {
  return { page, size: PAGE_SIZE, totalPages: data?.totalPages ?? 0, totalElements: data?.totalElements ?? 0 };
}

export default function AllDataPage() {
  const { refreshSidebarProjects } = useSidebarProjects();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "projects" ? "projects" : "tasks";
  const includeArchived = params.get("archived") === "1";
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [taskPage, setTaskPage] = useState(0);
  const [projectPage, setProjectPage] = useState(0);
  const [search, setSearch] = useState("");
  const [taskOrder, setTaskOrder] = useState<ExploreOrder<TaskSortField>>({ sortBy: "plannedDate", direction: "DESC" });
  const [projectOrder, setProjectOrder] = useState<ExploreOrder<ProjectSortField>>({ sortBy: "id", direction: "DESC" });
  const tasks = useAllTasks({
    page: taskPage, size: PAGE_SIZE, ...taskOrder,
    ...taskFilterQuery(filters),
  });
  const projects = useWorkProjects({ page: projectPage, size: PAGE_SIZE, ...projectOrder, includeArchived, search });
  const updateProject = useProjectFlags();

  function toggleProjectFlag(project: WorkProject, field: "favorite" | "archive") {
    if (updateProject.isPending) return;
    const value = field === "favorite" ? !project.favorite : !project.archived;
    updateProject.mutate({ project, field, value }, {
      onSuccess: result => {
        refreshSidebarProjects();
        if (result.refreshFailed) toast.info("Alteração salva. Atualize a lista para ver os dados recentes.");
        else toast.success("Alteração salva.");
      },
      onError: () => toast.error("Não foi possível salvar. Atualize os dados antes de tentar novamente."),
    });
  }

  function changeTasks(update: Partial<TaskFilters>) {
    setFilters(current => ({ ...current, ...update }));
    setTaskPage(0);
  }

  function changeProjects(update: Partial<ProjectsFilters>) {
    setProjectPage(0);
    if (update.searchQuery !== undefined) setSearch(update.searchQuery);
    if (update.includeArchived !== undefined) setParams(current => {
      const next = new URLSearchParams(current);
      next.set("tab", "projects");
      if (update.includeArchived) next.set("archived", "1");
      else next.delete("archived");
      return next;
    }, { replace: true });
  }

  return (
    <div className="min-w-0 w-full">
      <h1 className="sr-only">Explorar</h1>
      <Tabs value={tab} onValueChange={value => setParams(current => {
        const next = new URLSearchParams(current);
        next.set("tab", value);
        return next;
      }, { replace: true })}>
        <TabsList variant="line" className="flex" aria-label="Tipo de resultado">
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-3">
          <TasksDataTable tasks={tasks.data?.content ?? []} isLoading={tasks.isPending}
            pagination={pagination(tasks.data, taskPage)} onPageChange={setTaskPage} filters={filters} onFilterChange={changeTasks}
            onClearFilters={() => { setFilters(EMPTY_TASK_FILTERS); setTaskPage(0); }}
            sorting={{ order: taskOrder, onChange: order => { setTaskOrder(order); setTaskPage(0); } }}
            feedback={tasks.isError ? { error: tasks.error, retry: () => void tasks.refetch() } : undefined} />
        </TabsContent>
        <TabsContent value="projects" className="mt-3">
          <ProjectsDataTable projects={projects.data?.content ?? []} isLoading={projects.isPending}
            pagination={pagination(projects.data, projectPage)} onPageChange={setProjectPage}
            filters={{ includeArchived, searchQuery: search }} onFilterChange={changeProjects}
            sorting={{ order: projectOrder, onChange: order => { setProjectOrder(order); setProjectPage(0); } }}
            onToggleArchive={project => toggleProjectFlag(project, "archive")}
            onToggleFavorite={project => toggleProjectFlag(project, "favorite")}
            feedback={projects.isError ? { error: projects.error, retry: () => void projects.refetch() } : undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
