import { useState } from "react";
import { Search, X, Star, Archive, MoreVertical, StarOff } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ProjectDTO } from "@/types/task";
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

  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
  };

  const hasActiveFilters =
    filters.includeArchived || filters.searchQuery !== "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Todos os Projetos</CardTitle>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 items-start sm:items-center flex-wrap">
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
              className="text-sm cursor-pointer"
            >
              Mostrar arquivados
            </Label>
          </div>

          {/* Search */}
          <div className="relative flex-1 flex items-center gap-0 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 rounded-r-none border-r-0"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSearchClick}
              className="rounded-l-none border-l h-10 w-10 shrink-0"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {hasActiveFilters
              ? "Nenhum resultado encontrado. Ajuste os filtros."
              : "Nenhum projeto encontrado."}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Título</TableHead>
                    <TableHead className="w-[250px]">Descrição</TableHead>
                    <TableHead className="w-[180px]">Progresso</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Favorito
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {project.color && (
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                          )}
                          {project.title}
                        </div>
                      </TableCell>
                      <TableCell>
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
                          <span className="text-sm text-muted-foreground w-10">
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
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-0">
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Star
                          className={cn(
                            "h-5 w-5 mx-auto",
                            project.favorite
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
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
                                  <span>Remover Favorito</span>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {currentPage * pageSize + 1} a{" "}
                  {Math.min((currentPage + 1) * pageSize, totalElements)} de{" "}
                  {totalElements} projetos
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(Math.max(0, currentPage - 1))
                    }
                    disabled={currentPage === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(
                        Math.min(totalPages - 1, currentPage + 1)
                      )
                    }
                    disabled={currentPage === totalPages - 1}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
