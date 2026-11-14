import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  Archive,
  MoreVertical,
  StarOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { WorkProject as ProjectDTO } from "@/types/work";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export interface ProjectsFilters {
  includeArchived: boolean;
  searchQuery: string;
}

interface ProjectsDataTableProps {
  projects: ProjectDTO[];
  isLoading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
  filters: ProjectsFilters;
  onFilterChange: (filters: Partial<ProjectsFilters>) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

export function ProjectsDataTable({
  projects,
  isLoading = false,
  pagination,
  onPageChange,
  filters,
  onFilterChange,
  onArchive,
  onUnarchive,
  onToggleFavorite,
}: ProjectsDataTableProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const pageSize = 20;
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalElements = pagination.totalElements;
  const firstItem = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const lastItem = Math.min((currentPage + 1) * pageSize, totalElements);


  const renderActions = (project: ProjectDTO) => (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label={`Ações de ${project.title}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* Opção de Favoritar */}
                          <DropdownMenuItem
                            onClick={() => onToggleFavorite(project.id)}
                          >
                            {project.favorite ? (
                              <>
                                <StarOff className="mr-2 h-4 w-4" />
                                <span>Remover favorito</span>
                              </>
                            ) : (
                              <>
                                <Star className="mr-2 h-4 w-4" />
                                <span>Favoritar</span>
                              </>
                            )}
                          </DropdownMenuItem>

                          {/* Opção de Arquivar/Desarquivar */}
                          {project.archived ? (
                            <DropdownMenuItem
                              onClick={() => onUnarchive(project.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              <span>Desarquivar</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onArchive(project.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              <span>Arquivar</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
  );

  const clearFilters = () => {
    setSearchInput("");
    onFilterChange({
      includeArchived: false,
      searchQuery: "",
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onFilterChange({ searchQuery: searchInput });
    }
  };

  const handleSearchClick = () => {
    onFilterChange({ searchQuery: searchInput });
  };

  const hasActiveFilters =
    filters.includeArchived || filters.searchQuery !== "";

  const activeFilterCount =
    (filters.includeArchived ? 1 : 0) + (filters.searchQuery !== "" ? 1 : 0);

  const filtersPanel = (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Toggle Archived */}
        <div className="flex items-center space-x-2">
          <Switch
            id="include-archived"
            checked={filters.includeArchived}
            onCheckedChange={(checked) =>
              onFilterChange({ includeArchived: checked })
            }
          />
          <Label
            htmlFor="include-archived"
            className="cursor-pointer text-sm"
          >
            Mostrar arquivados
          </Label>
        </div>

        {/* Search */}
        <div className="relative flex min-w-[200px] flex-1 items-center gap-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título"
              aria-label="Buscar por título"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="rounded-r-none border-r-0 pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearchClick}
            aria-label="Buscar"
            className="h-10 w-10 shrink-0 rounded-l-none border-l"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        )}
    </div>
  );

  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-medium">Todos os projetos</CardTitle>

          {!isDesktop && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 gap-2">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="px-1.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[85dvh] overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Refine a lista de projetos.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-4">{filtersPanel}</div>
                <SheetFooter className="flex-row justify-end gap-2">
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="mr-2 h-4 w-4" aria-hidden />
                      Limpar
                    </Button>
                  )}
                  <SheetClose asChild>
                    <Button>Fechar</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {isDesktop && <div className="pt-4">{filtersPanel}</div>}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">
            Carregando...
          </p>
        ) : projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {hasActiveFilters
                  ? "Nenhum resultado encontrado"
                  : "Nenhum projeto encontrado"}
              </EmptyTitle>
              <EmptyDescription>
                {hasActiveFilters
                  ? "Ajuste os filtros para ver mais resultados."
                  : "Os projetos criados aparecerão aqui."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {/* Abaixo de 768 a tabela vira lista de 2 linhas (SPEC §11.7). */}
            <div className="hidden overflow-x-auto rounded-lg border lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Título</TableHead>
                    {/* Abaixo de xl a tabela cabe sem a descrição; no mobile
                        ela ainda rola dentro do container (SPEC §11.7). */}
                    <TableHead className="hidden w-[250px] xl:table-cell">
                      Descrição
                    </TableHead>
                    <TableHead className="w-[180px]">Objetivos e tarefas</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Favorito
                    </TableHead>
                    <TableHead className="w-[50px]">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {project.color && (
                            <div
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: project.color }}
                              aria-hidden
                            />
                          )}
                          {project.title}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="line-clamp-2 text-muted-foreground">
                          {project.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ProjectCounts project={project} />
                      </TableCell>
                      <TableCell>
                        {project.archived ? (
                          <Badge variant="secondary" className="gap-1">
                            <Archive className="h-3 w-3" />
                            Arquivado
                          </Badge>
                        ) : (
                          <Badge variant="positive">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Star
                          role="img"
                          aria-label={
                            project.favorite
                              ? `Favorito: ${project.title}`
                              : `Não favorito: ${project.title}`
                          }
                          className={cn(
                            "mx-auto h-5 w-5",
                            project.favorite
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                      </TableCell>
                      <TableCell>{renderActions(project)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul
              aria-label="Lista de projetos"
              className="divide-y divide-border/60 rounded-lg border border-border/60 lg:hidden"
            >
              {projects.map((project) => (
                <li key={project.id} className="flex flex-col gap-2 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {project.color && (
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                        aria-hidden
                      />
                    )}
                    <span
                      className="truncate text-sm font-medium"
                      title={project.title}
                    >
                      {project.title}
                    </span>
                    <Star
                      role="img"
                      aria-label={
                        project.favorite
                          ? `Favorito: ${project.title}`
                          : `Não favorito: ${project.title}`
                      }
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        project.favorite
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <ProjectCounts project={project} />
                    <div className="flex items-center gap-1">
                      {project.archived ? (
                        <Badge variant="secondary" className="gap-1">
                          <Archive className="h-3 w-3" aria-hidden />
                          Arquivado
                        </Badge>
                      ) : (
                        <Badge variant="positive">Ativo</Badge>
                      )}
                      {renderActions(project)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>


            {totalElements > 0 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {firstItem} a {lastItem} de {totalElements}{" "}
                  {totalElements === 1 ? "projeto" : "projetos"}
                </p>
                <Pagination className="mx-0 w-full justify-center sm:w-auto sm:justify-end">
                  <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        className="max-md:h-10"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 0}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" aria-hidden />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="whitespace-nowrap px-2 text-sm tabular-nums text-muted-foreground">
                        Página {currentPage + 1} de {Math.max(totalPages, 1)}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        className="max-md:h-10"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
                        aria-label="Próxima página"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="h-4 w-4 sm:ml-1" aria-hidden />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectCounts({ project }: { project: ProjectDTO }) {
  const s = project.summary;
  return <div className="text-sm tabular-nums">
    <p>{s.totalObjectives ? `${s.completedObjectives}/${s.totalObjectives} objetivos` : "Nenhum objetivo definido"}</p>
    {project.mode === "DEVELOPMENT" && <p className="text-muted-foreground">
      {s.nonCancelledTasks ? `${s.completedTasks}/${s.nonCancelledTasks} tarefas` : "Nenhuma tarefa ativa"} · {s.cancelledTasks} {s.cancelledTasks === 1 ? "cancelada" : "canceladas"}
    </p>}
  </div>;
}
