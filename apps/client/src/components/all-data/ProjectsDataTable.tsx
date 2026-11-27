import { useId, type CSSProperties } from "react";
import { Archive, CircleCheck, Ellipsis, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectCoverThumbnail } from "@/components/projects/ProjectCoverThumbnail";
import { cn } from "@/lib/utils";
import type { WorkProject } from "@/types/work";
import { ExploreList, ExploreResults, ExploreTable, type ExplorePage } from "./ExploreResults";
import { ExploreSortHead, ExploreSortMenu, type ExploreSortColumn, type ExploreSorting } from "./ExploreSort";

export type ProjectSortField = "id" | "title" | "description" | "archived" | "favorite";

const PROJECT_COLUMNS = {
  title: { field: "title", label: "Projeto" },
  description: { field: "description", label: "Descrição", className: "hidden w-1/4 xl:table-cell" },
  archived: { field: "archived", label: "Status", className: "w-28" },
  favorite: { field: "favorite", label: "Favorito", className: "w-24", firstDirection: "DESC" },
} as const satisfies Record<Exclude<ProjectSortField, "id">, ExploreSortColumn<ProjectSortField>>;

const PROJECT_LIST_SORT: readonly ExploreSortColumn<ProjectSortField>[] = [
  { field: "id", label: "Ordem de criação", firstDirection: "DESC" },
  PROJECT_COLUMNS.title, PROJECT_COLUMNS.archived, PROJECT_COLUMNS.favorite,
];

export interface ProjectsFilters {
  includeArchived: boolean;
  searchQuery: string;
}

interface ProjectsDataTableProps {
  projects: WorkProject[];
  isLoading: boolean;
  pagination: ExplorePage;
  onPageChange: (page: number) => void;
  filters: ProjectsFilters;
  sorting: ExploreSorting<ProjectSortField>;
  onFilterChange: (filters: Partial<ProjectsFilters>) => void;
  onToggleArchive: (project: WorkProject) => void;
  onToggleFavorite: (project: WorkProject) => void;
  feedback?: { error: unknown; retry: () => void };
}

export function ProjectsDataTable({ projects, isLoading, pagination, onPageChange, filters, onFilterChange,
  onToggleArchive, onToggleFavorite, feedback, sorting }: ProjectsDataTableProps) {
  const archivedId = useId();
  return (
    <ExploreResults resources="projetos" emptyTitle="Nenhum projeto encontrado" emptyDescription="Os projetos criados aparecerão aqui."
      isLoading={isLoading} hasRows={projects.length > 0} pagination={pagination} onPageChange={onPageChange} feedback={feedback}
      search={{ query: filters.searchQuery, submit: searchQuery => onFilterChange({ searchQuery }) }}
      filters={{
        count: Number(filters.includeArchived),
        clear: () => onFilterChange({ searchQuery: "", includeArchived: false }),
        sections: [{ id: "archived", icon: Archive, label: "Arquivados", fields: <Field orientation="horizontal">
          <FieldLabel htmlFor={archivedId}>Mostrar arquivados</FieldLabel>
          <Switch id={archivedId} checked={filters.includeArchived} onCheckedChange={includeArchived => onFilterChange({ includeArchived })} />
        </Field> }],
      }}>
      <ExploreTable label="Projetos">
        <TableHeader>
          <TableRow>
            <ExploreSortHead column={PROJECT_COLUMNS.title} sorting={sorting} />
            <ExploreSortHead column={PROJECT_COLUMNS.description} sorting={sorting} />
            <TableHead scope="col" className="w-44">Objetivos e tarefas</TableHead>
            <ExploreSortHead column={PROJECT_COLUMNS.archived} sorting={sorting} />
            <ExploreSortHead column={PROJECT_COLUMNS.favorite} sorting={sorting} />
            <TableHead scope="col" className="w-14"><span className="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(project => (
            <TableRow key={project.id}>
              <TableCell><ProjectIdentity project={project} /></TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                <span className="line-clamp-2 break-words">{project.description || "—"}</span>
              </TableCell>
              <TableCell><ProjectCounts project={project} /></TableCell>
              <TableCell><ProjectStatus project={project} /></TableCell>
              <TableCell>
                <Star role="img" aria-label={project.favorite ? "Favorito" : "Não favorito"}
                  className={cn("size-4", project.favorite ? "fill-primary text-primary" : "text-muted-foreground")} />
              </TableCell>
              <TableCell>
                <ProjectActions project={project} onToggleArchive={onToggleArchive} onToggleFavorite={onToggleFavorite} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ExploreTable>

      <ExploreList label="Lista de projetos" ordering={<ExploreSortMenu columns={PROJECT_LIST_SORT} sorting={sorting} />}>
        {projects.map(project => (
          <li key={project.id} className="flex min-w-0 items-start gap-2 px-3 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <ProjectIdentity project={project} />
                {project.favorite && <Star role="img" aria-label="Favorito" className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />}
              </div>
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <ProjectCounts project={project} />
                <ProjectStatus project={project} />
              </div>
            </div>
            <ProjectActions project={project} onToggleArchive={onToggleArchive} onToggleFavorite={onToggleFavorite} />
          </li>
        ))}
      </ExploreList>
    </ExploreResults>
  );
}

function ProjectIdentity({ project }: { project: WorkProject }) {
  const color = project.color ? { "--project-color": project.color } as CSSProperties : undefined;
  return (
    <div className="flex min-w-0 items-start gap-2">
      <ProjectCoverThumbnail imageUrl={project.imageUrl} className="mt-0.5" fallback={
        <span aria-hidden style={color} className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", color ? "bg-[var(--project-color)]" : "bg-muted-foreground")} />
      } />
      <p className="min-w-0 break-words font-medium">{project.title}</p>
    </div>
  );
}

function ProjectCounts({ project }: { project: WorkProject }) {
  const { totalObjectives, completedObjectives, nonCancelledTasks, completedTasks, cancelledTasks } = project.summary;
  return (
    <div className="text-xs tabular-nums">
      <p>{totalObjectives ? `${completedObjectives}/${totalObjectives} objetivos` : "Nenhum objetivo definido"}</p>
      {project.mode === "DEVELOPMENT" && <p className="text-muted-foreground">
        {nonCancelledTasks ? `${completedTasks}/${nonCancelledTasks} tarefas` : "Nenhuma tarefa ativa"}
        <span className="whitespace-nowrap"> · {cancelledTasks} {cancelledTasks === 1 ? "cancelada" : "canceladas"}</span>
      </p>}
    </div>
  );
}

function ProjectStatus({ project }: { project: WorkProject }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      {project.archived ? <Archive aria-hidden className="size-3.5 text-muted-foreground" /> : <CircleCheck aria-hidden className="size-3.5 text-positive" />}
      {project.archived ? "Arquivado" : "Ativo"}
    </span>
  );
}

function ProjectActions({ project, onToggleArchive, onToggleFavorite }: {
  project: WorkProject;
  onToggleArchive: (project: WorkProject) => void;
  onToggleFavorite: (project: WorkProject) => void;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={`Ações de ${project.title}`}><Ellipsis aria-hidden /></Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Ações do projeto</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onToggleFavorite(project)}>
            {project.favorite ? <StarOff aria-hidden /> : <Star aria-hidden />}
            {project.favorite ? "Remover favorito" : "Favoritar"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleArchive(project)}>
            <Archive aria-hidden />
            {project.archived ? "Desarquivar" : "Arquivar"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
