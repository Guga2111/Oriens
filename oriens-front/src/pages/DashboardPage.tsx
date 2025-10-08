import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  LayoutGrid,
  Sun,
  Sunset,
  Moon,
  Loader2,
  CheckSquare,
  MessageCircle,
  Pencil,
} from "lucide-react";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { Progress } from "@/components/ui/progress";
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
import { UserProfileNav } from "@/components/dashboard/UserProfileNav";

interface Task {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "ON_DOING" | "CONCLUDED";
}

export function DashboardPage() {
  const { logout, userId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-background">
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-primary">
              <CheckSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Oriens
              </h1>
              <p className="text-xs text-muted-foreground">Organize seu dia</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>

            <UserProfileNav />
            <Button variant="ghost" onClick={logout}>
              Sair
            </Button>
          </div>
        </header>

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

      <aside className="w-80 border-l border-border p-6 hidden lg:block bg-white dark:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do dia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Concluídas</span>
              <span className="font-semibold text-orange-400">
                {concludedTasks}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pendentes</span>
              <span className="font-semibold text-orange-500">
                {pendingTasks}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-primary/20">
              <div
                className="h-2 rounded-full bg-gradient-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6 border-primary/30 bg-primary/10">
          <CardHeader className="p-0">
            <div className="flex items-center gap-2 p-6 pb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-primary">
                Integração WhatsApp
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <p className="text-sm text-primary/80 mb-4">
              Receba lembretes e compartilhe suas tarefas diretamente pelo
              WhatsApp.
            </p>
            <Button className="w-full text-primary-foreground bg-gradient-primary hover:opacity-80 transition-opacity">
              Conectar WhatsApp
            </Button>
          </CardContent>
        </Card>
      </aside>

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
  );
}
