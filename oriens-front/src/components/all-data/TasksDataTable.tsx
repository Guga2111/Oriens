import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Search,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Calendar } from "@/components/ui/calendar";
import { TaskDTO, Priority, Status } from "@/types/task";
import { PRIORITY, TASK_STATUS } from "@/lib/labels";

export interface TasksFilters {
  status: string;
  priority: string;
  searchQuery: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface TasksDataTableProps {
  tasks: TaskDTO[];
  isLoading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange: (page: number) => void;
  filters: TasksFilters;
  onFilterChange: (filters: Partial<TasksFilters>) => void;
}

export function TasksDataTable({
  tasks,
  isLoading = false,
  pagination,
  onPageChange,
  filters,
  onFilterChange,
}: TasksDataTableProps) {
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
      status: "all",
      priority: "all",
      searchQuery: "",
      startDate: undefined,
      endDate: undefined,
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
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.searchQuery !== "" ||
    filters.startDate !== undefined ||
    filters.endDate !== undefined;

  const formatTime = (time: string): string => {
    if (!time) return "-";
    const parts = time.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Todas as tarefas</CardTitle>

        {/* Filters */}
        <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:flex-wrap">
          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange({ status: value })}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value={Status.PENDING}>
                {TASK_STATUS.PENDING.label}
              </SelectItem>
              <SelectItem value={Status.ON_DOING}>
                {TASK_STATUS.ON_DOING.label}
              </SelectItem>
              <SelectItem value={Status.CONCLUDED}>
                {TASK_STATUS.CONCLUDED.label}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters.priority}
            onValueChange={(value) => onFilterChange({ priority: value })}
          >
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label="Prioridade"
            >
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value={Priority.LOW}>{PRIORITY.LOW.label}</SelectItem>
              <SelectItem value={Priority.MEDIUM}>
                {PRIORITY.MEDIUM.label}
              </SelectItem>
              <SelectItem value={Priority.HIGH}>
                {PRIORITY.HIGH.label}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate && filters.endDate
                  ? `${format(filters.startDate, "dd/MM/yy")} - ${format(
                      filters.endDate,
                      "dd/MM/yy"
                    )}`
                  : "Filtrar por data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <div className="flex flex-col gap-4 p-3 sm:flex-row">
                <div>
                  <p className="mb-2 text-center text-sm font-medium">
                    Data início
                  </p>
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => onFilterChange({ startDate: date })}
                  />
                </div>
                <div className="border-t pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <p className="mb-2 text-center text-sm font-medium">
                    Data fim
                  </p>
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => onFilterChange({ endDate: date })}
                  />
                </div>
              </div>
              {(filters.startDate || filters.endDate) && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      onFilterChange({
                        startDate: undefined,
                        endDate: undefined,
                      })
                    }
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpar datas
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

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
        ) : tasks.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {hasActiveFilters
                  ? "Nenhum resultado encontrado"
                  : "Nenhuma tarefa encontrada"}
              </EmptyTitle>
              <EmptyDescription>
                {hasActiveFilters
                  ? "Ajuste os filtros para ver mais resultados."
                  : "As tarefas criadas aparecerão aqui."}
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
                    <TableHead className="hidden w-[200px] xl:table-cell">
                      Descrição
                    </TableHead>
                    <TableHead className="w-[120px] text-right">Data</TableHead>
                    <TableHead className="w-[80px] text-right">
                      Horário
                    </TableHead>
                    <TableHead className="w-[100px]">Prioridade</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.title}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="line-clamp-2 text-muted-foreground">
                          {task.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {task.dueDate
                          ? format(parseISO(task.dueDate), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTime(task.startTime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY[task.priority].badge}>
                          {PRIORITY[task.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={TASK_STATUS[task.status].badge}>
                          {TASK_STATUS[task.status].label}
                        </Badge>
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
                  {totalElements === 1 ? "tarefa" : "tarefas"}
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
