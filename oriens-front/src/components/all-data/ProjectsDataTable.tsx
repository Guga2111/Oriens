import { useState } from "react";
import {
  Search,
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
import { ProjectDTO } from "@/types/project";
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

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalElements = pagination.totalElements;
  const firstItem = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const lastItem = Math.min((currentPage + 1) * pageSize, totalElements);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Todos os projetos</CardTitle>

        {/* Filters */}
        <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
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
            {/* Até o P2 a tabela rola dentro deste container (SPEC §11.7). */}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Título</TableHead>
                    {/* Abaixo de xl a tabela cabe sem a descrição; no mobile
                        ela ainda rola dentro do container (SPEC §11.7). */}
                    <TableHead className="hidden w-[250px] xl:table-cell">
                      Descrição
                    </TableHead>
                    <TableHead className="w-[180px]">Progresso</TableHead>
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
                        <div className="flex items-center gap-2">
                          <Progress
                            value={project.progress}
                            className="h-2 flex-1"
                          />
                          <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                            {project.progress}%
                          </span>
                        </div>
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
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

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
