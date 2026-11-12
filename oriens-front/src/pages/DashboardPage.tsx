import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  LayoutGrid,
  Sun,
  Sunset,
  Moon,
  Loader2
} from "lucide-react";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { format, subDays, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WeekSelector } from "@/components/dashboard/WeekSelector";
import { EditTaskDialog } from "@/components/dashboard/EditTaskDialog";
import { toast } from "@/hooks/use-toast";
import { WeekView } from "@/components/dashboard/WeekView";
import { TaskSection } from "@/components/dashboard/TaskSection";
import { SummaryAside } from "@/components/dashboard/SummaryAside";
import { PageHeader } from "@/components/common/PageHeader";

interface Task {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "ON_DOING" | "CONCLUDED";
  location?: { // Location with '?' for being optional
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export function DashboardPage() {
  const { userId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);

  console.log("Rendirizou!");

  const fetchTasks = async (isInitialLoad = false) => {
    if (!userId) return;

    if (isInitialLoad) {
      setIsLoading(true);
    }

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

        const formattedStartDate = format(weekStart, "yyyy-MM-dd");
        const formattedEndDate = format(weekEnd, "yyyy-MM-dd");

        response = await apiClient.get(
          `/task/user/${userId}/range?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
        );
      }

      setTasks(response.data);
    } catch (error) {
      console.error("Falha ao buscar tarefas: ", error);
      toast({
        variant: "destructive",
        title: "Erro de Rede",
        description:
          "Não foi possível buscar suas tarefas. Tente novamente mais tarde.",
      });
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  };

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      const response = await apiClient.get(`/user/${userId}`);
      setUserPhoneNumber(response.data.phoneNumber || null);
    } catch (error) {
      console.error("Falha ao buscar dados do usuário: ", error);
    }
  };

  useEffect(() => {
    fetchTasks(true);
    fetchUserData();
  }, [userId, currentDate, viewMode]);

  const getTasksForPeriod = (start: string, end: string) => {
    return tasks
      .filter((task) => task.startTime >= start && task.startTime <= end)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const morningTasks = getTasksForPeriod("00:00:00", "11:59:59");
  const afternoonTasks = getTasksForPeriod("12:00:00", "17:59:59");
  const nightTasks = getTasksForPeriod("18:00:00", "23:59:59");

  const countConcluded = (tasks: Task[]) =>
    tasks.filter((t) => t.status === "CONCLUDED").length;

  const totalTasks = tasks.length;
  const concludedTasks = countConcluded(tasks);
  const pendingTasks = totalTasks - concludedTasks;
  const progress =
    totalTasks > 0 ? Math.round((concludedTasks / totalTasks) * 100) : 0;

  // Loading acontece dentro do shell (SPEC §10.2): nunca em tela cheia.
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center p-24"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Carregando tarefas</span>
      </div>
    );
  }

  const isToday = isSameDay(currentDate, new Date());
  const longDate = format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const longDateCapitalized = longDate.charAt(0).toUpperCase() + longDate.slice(1);
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

  return (
    <>
      <div className="flex min-h-full">
        <div className="min-w-0 flex-1 p-6 md:p-8">
        <PageHeader
          title={title}
          meta={meta}
          actions={
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={viewMode === "day" ? "Dia anterior" : "Semana anterior"}
                  onClick={() =>
                    setCurrentDate(subDays(currentDate, viewMode === "day" ? 1 : 7))
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={viewMode === "day" ? "Próximo dia" : "Próxima semana"}
                  onClick={() =>
                    setCurrentDate(addDays(currentDate, viewMode === "day" ? 1 : 7))
                  }
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Hoje
                </Button>
              </div>

              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value: "day" | "week") => value && setViewMode(value)}
              >
                <ToggleGroupItem value="day" aria-label="Ver dia">
                  <Calendar className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Dia</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="Ver semana">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Semana</span>
                </ToggleGroupItem>
              </ToggleGroup>

              <Button
                className="text-primary-foreground bg-primary hover:opacity-80 transition-opacity"
                onClick={() => setIsCreateTaskOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
              </Button>
            </>
          }
        />

        {viewMode === "week" && (
          <div className="mt-6">
            <WeekSelector
              currentDate={currentDate}
              setCurrentDate={(date) => setCurrentDate(new Date(date))}
            />
          </div>
        )}

        {viewMode === "day" ? (
          <div className="mt-6 space-y-8">
            <TaskSection
              title="Manhã"
              timeRange="00:00 - 11:59"
              icon={<Sun className="h-6 w-6 text-yellow-500" />}
              tasks={morningTasks}
              onUpdateTasks={fetchTasks}
              onEditTask={setEditingTask}
              viewMode={viewMode}
            />
            <TaskSection
              title="Tarde"
              timeRange="12:00 - 17:59"
              icon={<Sunset className="h-6 w-6 text-orange-500" />}
              tasks={afternoonTasks}
              onUpdateTasks={fetchTasks}
              onEditTask={setEditingTask}
              viewMode={viewMode}
            />
            <TaskSection
              title="Noite"
              timeRange="18:00 - 23:59"
              icon={<Moon className="h-6 w-6 text-indigo-500" />}
              tasks={nightTasks}
              onUpdateTasks={fetchTasks}
              onEditTask={setEditingTask}
              viewMode={viewMode}
            />
          </div>
        ) : (
          <div className="mt-6">
            <WeekView
              tasks={tasks}
              currentDate={currentDate}
              onUpdateTasks={fetchTasks}
              onEditTask={setEditingTask}
              viewMode={viewMode}
            />
          </div>
        )}
      </div>

      <SummaryAside
        totalTasks={totalTasks}
        concludedTasks={concludedTasks}
        pendingTasks={pendingTasks}
        progress={progress}
        userPhoneNumber={userPhoneNumber}
        onPhoneNumberUpdated={fetchUserData}
      />
      </div>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        onTaskCreated={fetchTasks}
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
