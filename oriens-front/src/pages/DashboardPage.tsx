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
import { useMemo, useRef, useState } from "react";
import { useTaskDay, useTaskWeek } from "@/hooks/useWork";
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
import { useSearchParams } from 'react-router-dom';
import { validCalendarDate } from '@/lib/work-form';
import { productDate } from '@/lib/product-time';
import { useProductToday } from '@/hooks/useProductToday';
import { compareTaskPriority } from '@/lib/tasks';
import type { Task } from "@/types/task";

export function DashboardPage() {
  const today = useProductToday();
  const [search, setSearch] = useSearchParams();
  const rawDate = search.get('date');
  const selectedDate = rawDate && validCalendarDate(rawDate) ? productDate(rawDate) : null;
  const currentDate = selectedDate ?? productDate(today);
  const contentRef = useRef<HTMLDivElement>(null);
  const setSelectedDate = (date: Date | null) => setSearch(previous => { if (date) previous.set('date', format(date, 'yyyy-MM-dd')); else previous.delete('date'); return previous; });
  const setCurrentDate = (date: Date) => { setSelectedDate(date); };
  const viewMode = search.get('view') === 'week' ? 'week' : 'day';
  const setViewMode = (view: 'day' | 'week') => setSearch(previous => { previous.set('view', view); return previous; });

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDefaults, setCreateTaskDefaults] = useState<{
    date: Date;
    startTime?: string;
  }>({ date: productDate(today) });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const day = useTaskDay(format(currentDate, "yyyy-MM-dd"), viewMode === "day");
  const week = useTaskWeek(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd"),
    viewMode === "week"
  );
  const query = viewMode === "day" ? day : week;
  const tasks = useMemo(() => viewMode === "day"
    ? [...(day.data?.planned ?? []), ...(day.data?.completed ?? [])]
    : week.data?.tasks ?? [], [viewMode, day.data, week.data]);
  const isInitialLoading = query.isPending;
  const isRefreshing = query.isFetching && !query.isPending;
  const error = query.isError ? "Não foi possível carregar suas tarefas." : null;
  const fetchTasks = () => { void query.refetch(); };
  const afterWrite = () => {
    // Writes already own refetching. Restore a stable focus target if the row left its list.
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) contentRef.current?.focus();
    });
  };

  const openCreateTask = (date: Date = currentDate, startTime?: string) => {
    setCreateTaskDefaults({ date, startTime });
    setIsCreateTaskOpen(true);
  };

  const periods = useMemo(() => groupTasksByPeriod(tasks), [tasks]);

  const isToday = isSameDay(currentDate, productDate(today));
  const longDate = format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const longDateCapitalized =
    longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const title = isToday ? "Hoje" : longDateCapitalized;
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
      <div className="planning-screen min-w-0 w-full">
        <div className="min-w-0 w-full">
          <PageHeader
            className="md:flex-col lg:flex-row"
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
                    onClick={() => { setSelectedDate(null); }}
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
              ref={contentRef} tabIndex={-1} aria-label="Planejamento do dia"
              className="mt-6 flex flex-col gap-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-busy={isRefreshing}
              aria-live="polite"
            >
              <h2 className="text-lg font-semibold">{isToday ? 'Planejado para hoje' : 'Planejado para este dia'}</h2>
              <TaskSection title="Sem horário" emptyLabel="Nenhuma tarefa sem horário." tasks={[...tasks].filter(t => !t.startTime).sort(compareTaskPriority)} onUpdateTasks={afterWrite} onEditTask={setEditingTask} onAddTask={() => openCreateTask()} isLoading={isInitialLoading} />
              {periods.map((period) => (
                <TaskSection
                  key={period.id}
                  title={period.title}
                  timeRange={period.range}
                  emptyLabel={period.emptyLabel}
                  tasks={period.tasks}
                  onUpdateTasks={afterWrite}
                  onEditTask={setEditingTask}
                  onAddTask={() => openCreateTask(currentDate)}
                  isLoading={isInitialLoading}
                />
              ))}
              {isToday && <>
                <TaskSection title="Pendentes de dias anteriores" timeRange="Planejamento anterior preservado até você reagendar." emptyLabel="Nenhuma pendência de dias anteriores." tasks={day.data?.previousPlans ?? []} onUpdateTasks={afterWrite} onEditTask={setEditingTask} isLoading={isInitialLoading} />
                <TaskSection title="Prazos que precisam de atenção" timeRange="Prazo final hoje ou ultrapassado; o planejamento não muda." emptyLabel="Nenhum prazo precisando de atenção." tasks={day.data?.deadlineAttention ?? []} onUpdateTasks={afterWrite} onEditTask={setEditingTask} isLoading={isInitialLoading} />
              </>}
            </div>
          ) : (
            <div ref={contentRef} tabIndex={-1} className="mt-6 flex flex-col gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Planejamento da semana" aria-busy={isRefreshing}>
              <Button variant="link" onClick={() => { setSearch({}); }}>Revisar pendências em Hoje</Button>
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
                  onUpdateTasks={afterWrite}
                  onEditTask={setEditingTask}
                  onSelectDay={(date) => {
                    setSearch({ date: format(date, 'yyyy-MM-dd'), view: 'day' });
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
        onTaskCreated={afterWrite}
        defaultDate={createTaskDefaults.date}
        defaultStartTime={createTaskDefaults.startTime}
      />
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={() => setEditingTask(null)}
          onTaskUpdated={afterWrite}
        />
      )}
    </>
  );
}
