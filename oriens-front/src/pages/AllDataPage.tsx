import { useState } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { useSidebarProjects } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Status, Priority } from "@/types/task";
import { useAllTasks, useWorkProjects, useProjectFlags } from "@/hooks/useWork";
import { TasksDataTable, type TasksFilters } from "@/components/all-data/TasksDataTable";
import { ProjectsDataTable, type ProjectsFilters } from "@/components/all-data/ProjectsDataTable";

const INITIAL: TasksFilters = {
  status: "all", priority: "all", searchQuery: "", startDate: undefined, endDate: undefined, dateField: "plannedDate",
};
export default function AllDataPage() {
  const { refreshSidebarProjects } = useSidebarProjects();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "projects" ? "projects" : "tasks";
  const includeArchived = params.get("archived") === "1";
  const [filters, setFilters] = useState<TasksFilters>(INITIAL);
  const [taskPage, setTaskPage] = useState(0);
  const [projectPage, setProjectPage] = useState(0);
  const [search, setSearch] = useState("");
  const tasks = useAllTasks({
    page: taskPage, size: 20, sortBy: "plannedDate", direction: "DESC",
    status: filters.status === "all" ? undefined : filters.status as Status,
    priority: filters.priority === "all" ? undefined : filters.priority as Priority,
    search: filters.searchQuery || undefined, projectId: filters.projectId, dateField: filters.dateField,
    startDate: filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : undefined,
    endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : undefined,
  });
  const projects = useWorkProjects({ page: projectPage, size: 20, sortBy: "id", direction: "DESC", includeArchived, search });
  const updateProject = useProjectFlags();
  const projectAction = (id: number, field: "favorite" | "archive", value?: boolean) => {
    const project = projects.data?.content.find(p => p.id === id);
    if (project && !updateProject.isPending) updateProject.mutate({ project, field, value: value ?? !project.favorite }, {
      onSuccess: result => {
        refreshSidebarProjects();
        if (result.refreshFailed) toast.info("Alteração salva; atualize a lista para ver os dados recentes.");
        else toast.success("Alteração salva.");
      },
      onError: () => toast.error("Não foi possível salvar. Atualize os dados antes de tentar novamente."),
    });
  };
  const changeProjects = (update: Partial<ProjectsFilters>) => {
    setProjectPage(0);
    if (update.searchQuery !== undefined) setSearch(update.searchQuery);
    if (update.includeArchived !== undefined) setParams(current => {
      const next = new URLSearchParams(current);
      next.set("tab", "projects");
      if (update.includeArchived) next.set("archived", "1"); else next.delete("archived");
      return next;
    }, { replace: true });
  };
  const pagination = (data: { totalPages: number; totalElements: number } | undefined, page: number) =>
    ({ page, totalPages: data?.totalPages ?? 0, totalElements: data?.totalElements ?? 0 });
  return (
    <div className="p-6 md:p-8">
      <div className="flex max-w-[1280px] flex-col gap-6">
        <PageHeader title="Todos os dados" description="Visualize todas as suas tarefas e projetos em um só lugar." />
        <Tabs value={tab} onValueChange={value => setParams(current => {
          const next = new URLSearchParams(current); next.set("tab", value); return next;
        }, { replace: true })}>
          <TabsList><TabsTrigger value="tasks">Tarefas</TabsTrigger><TabsTrigger value="projects">Projetos</TabsTrigger></TabsList>
          <TabsContent value="tasks" className="mt-6">
            {tasks.isError ? <div role="alert" className="mb-4 text-sm">Não foi possível atualizar as tarefas.
              <Button variant="link" onClick={() => void tasks.refetch()}>Tentar novamente</Button></div> : null}
            {(!tasks.isError || tasks.data) && <TasksDataTable tasks={tasks.data?.content ?? []} isLoading={tasks.isPending}
              pagination={pagination(tasks.data, taskPage)} onPageChange={setTaskPage} filters={filters}
              onFilterChange={update => { setFilters(current => ({ ...current, ...update })); setTaskPage(0); }} />}
          </TabsContent>
          <TabsContent value="projects" className="mt-6">
            {projects.isError ? <div role="alert" className="mb-4 text-sm">Não foi possível atualizar os projetos.
              <Button variant="link" onClick={() => void projects.refetch()}>Tentar novamente</Button></div> : null}
            {(!projects.isError || projects.data) && <ProjectsDataTable projects={projects.data?.content ?? []} isLoading={projects.isPending}
              pagination={pagination(projects.data, projectPage)} onPageChange={setProjectPage}
              filters={{ includeArchived, searchQuery: search }} onFilterChange={changeProjects}
              onArchive={id => projectAction(id, "archive", true)}
              onUnarchive={id => projectAction(id, "archive", false)} onToggleFavorite={id => projectAction(id, "favorite")} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
