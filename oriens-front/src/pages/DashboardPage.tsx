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
import { format, subDays, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WeekSelector } from "@/components/dashboard/WeekSelector";
import { EditTaskDialog } from "@/components/dashboard/EditTaskDialog";
import { toast } from "@/hooks/use-toast";
import { WeekView } from "@/components/dashboard/WeekView";
import { TaskSection } from "@/components/dashboard/TaskSection";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SummaryAside } from "@/components/dashboard/SummaryAside";
import { AppHeader } from "@/components/common/AppHeader";

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

  useEffect(() => {
    fetchTasks(true);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
          <div className="flex h-screen w-full bg-gray-50/50 dark:bg-background">
            <AppSidebar />
            
            <main className="flex-1 flex flex-col">
              <AppHeader />

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-1 items-center justify-start gap-2">
                <Button
                  variant="outline"
                  size="icon"
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
              {viewMode === "day" && (
                <div className="flex flex-1 flex-col items-center gap-1">
                  <h2 className="text-xl font-semibold">
                    {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <p className="text-sm capitalize text-muted-foreground">
                    {format(currentDate, "EEEE", { locale: ptBR })}
                  </p>
                </div>
              )}
              {viewMode === "week" && (
                <div className="mb-8">
                  <WeekSelector
                    currentDate={currentDate}
                    setCurrentDate={(date) => setCurrentDate(new Date(date))}
                  />
                </div>
              )}
              <div className="flex flex-1 items-center justify-end gap-2">
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value: "day" | "week") =>
                    value && setViewMode(value)
                  }
                >
                  <ToggleGroupItem value="day" aria-label="Ver dia">
                    <Calendar className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="week" aria-label="Ver semana">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button
                  className="text-primary-foreground bg-gradient-primary hover:opacity-80 transition-opacity"
                  onClick={() => setIsCreateTaskOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
                </Button>
              </div>
            </div>

            {viewMode === "day" ? (
              <div className="space-y-8">
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
              <WeekView
                tasks={tasks}
                currentDate={currentDate}
                onUpdateTasks={fetchTasks}
                onEditTask={setEditingTask}
                viewMode={viewMode}
              />
            )}
          </div>
        </main>

        <SummaryAside 
          totalTasks={totalTasks}
          concludedTasks={concludedTasks}
          pendingTasks={pendingTasks}
          progress={progress}
        />

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
      </div>
    </SidebarProvider>
  );
}
