import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import {
  format,
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { EditTaskDialog } from "@/components/dashboard/EditTaskDialog";
import { WeekView } from "@/components/dashboard/WeekView";
import { TaskSection } from "@/components/dashboard/TaskSection";
import { DayLine } from "@/components/dashboard/DayLine";
import { PageHeader } from "@/components/common/PageHeader";
import { describeDay, describeWeek, groupTasksByPeriod } from "@/lib/tasks";
import type { Task } from "@/types/task";

export function DashboardPage() {
  const { userId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDefaults, setCreateTaskDefaults] = useState<{
    date: Date;
    startTime?: string;
  }>({ date: new Date() });
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const hasLoaded = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;

    // Troca de data/visão mantém os dados anteriores e mostra o spinner no
    // PageHeader; só o carregamento inicial usa skeletons (SPEC §11.1).
    if (hasLoaded.current) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }
    setError(null);

    try {
      let response;

      if (viewMode === "day") {
        const formattedDate = format(currentDate, "yyyy-MM-dd");
        response = await apiClient.get(
          `/task/user/${userId}?date=${formattedDate}`
        );
      } else {
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });

        response = await apiClient.get(
          `/task/user/${userId}/range?startDate=${format(
            weekStart,
            "yyyy-MM-dd"
          )}&endDate=${format(weekEnd, "yyyy-MM-dd")}`
        );
      }

      setTasks(response.data);
      hasLoaded.current = true;
    } catch (fetchError) {
      console.error("Falha ao buscar tarefas: ", fetchError);
      setError("Não foi possível carregar suas tarefas.");
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, currentDate, viewMode]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const openCreateTask = (date: Date = currentDate, startTime?: string) => {
    setCreateTaskDefaults({ date, startTime });
    setIsCreateTaskOpen(true);
  };

  const periods = useMemo(() => groupTasksByPeriod(tasks), [tasks]);

  const isToday = isSameDay(currentDate, new Date());
  const longDate = format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const longDateCapitalized =
    longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const title = isToday ? "Hoje" : longDateCapitalized;
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const meta =
    viewMode === "week"
      ? `Semana de ${format(weekStart, "d 'de' MMMM", { locale: ptBR })} a ${format(
          weekEnd,
          "d 'de' MMMM 'de' yyyy",
          { locale: ptBR }
        )}`
      : isToday
        ? longDateCapitalized
        : undefined;

  const description = isInitialLoading
    ? undefined
    : viewMode === "day"
      ? describeDay(tasks)
      : describeWeek(tasks);

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="max-w-[1280px]">
          <PageHeader
            title={title}
            description={description}
            meta={meta}
            isLoading={isRefreshing}
            actions={
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={
                      viewMode === "day" ? "Dia anterior" : "Semana anterior"
                    }
                    onClick={() =>
                      setCurrentDate(
                        subDays(currentDate, viewMode === "day" ? 1 : 7)
                      )
                    }
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={
                      viewMode === "day" ? "Próximo dia" : "Próxima semana"
                    }
                    onClick={() =>
                      setCurrentDate(
                        addDays(currentDate, viewMode === "day" ? 1 : 7)
                      )
                    }
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Hoje
                  </Button>
                </div>

                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value: "day" | "week") =>
                    value && setViewMode(value)
                  }
                >
                  <ToggleGroupItem value="day" aria-label="Ver dia">
                    <Calendar className="h-4 w-4" />
                    <span className="ml-1">Dia</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="week" aria-label="Ver semana">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="ml-1">Semana</span>
                  </ToggleGroupItem>
                </ToggleGroup>

                <Button
                  className="text-primary-foreground bg-primary hover:opacity-80 transition-opacity"
                  onClick={() => openCreateTask()}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
                </Button>
              </>
            }
          />

          {viewMode === "day" && !isInitialLoading && (
            <DayLine tasks={tasks} date={currentDate} />
          )}

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar tarefas</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchTasks()}
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {viewMode === "day" ? (
            <div
              className="mt-6 space-y-8"
              aria-busy={isRefreshing}
              aria-live="polite"
            >
              {periods.map((period) => (
                <TaskSection
                  key={period.id}
                  title={period.title}
                  timeRange={period.range}
                  emptyLabel={period.emptyLabel}
                  tasks={period.tasks}
                  onUpdateTasks={fetchTasks}
                  onEditTask={setEditingTask}
                  onAddTask={() => openCreateTask(currentDate)}
                  isLoading={isInitialLoading}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6" aria-busy={isRefreshing}>
              {isInitialLoading ? (
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <Skeleton key={index} className="h-40 w-full" />
                  ))}
                </div>
              ) : (
                <WeekView
                  tasks={tasks}
                  currentDate={currentDate}
                  onUpdateTasks={fetchTasks}
                  onEditTask={setEditingTask}
                  onSelectDay={(date) => {
                    setCurrentDate(date);
                    setViewMode("day");
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        onTaskCreated={fetchTasks}
        defaultDate={createTaskDefaults.date}
        defaultStartTime={createTaskDefaults.startTime}
      />
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={() => setEditingTask(null)}
          onTaskUpdated={fetchTasks}
        />
      )}
    </>
  );
}
