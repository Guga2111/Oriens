import { AppHeader } from "@/components/common/AppHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { KpiCard } from "@/components/statistics/KpiCard";
import { ReusableLineChartCard } from "@/components/statistics/ReusableLineChartCard";
import { ChartConfig } from "@/components/ui/chart";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CheckCircle2, Clock, FolderKanban, Loader2, TrendingUp } from "lucide-react";

import { getDashboardData } from "@/services/api";
import { DashboardData } from "@/types/statistics";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

const tasksChartConfig = {
  completed: {
    label: "Tarefas Concluídas",
    color: "hsl(var(--chart-1))", 
  },
} satisfies ChartConfig;

const projectsChartConfig = {
  created: {
    label: "Projetos Criados",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


export function StatisticsPage() {

  const {userId, isLoading: isAuthLoading} = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true); 
      return;
    }

    if (!userId) {
      setError("Usuário não autenticado.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true); 
        const fetchedData = await getDashboardData(userId);
        setData(fetchedData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Falha ao carregar as estatísticas.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
  }, [userId, isAuthLoading]);

  const renderContent = () => {

    if (isLoading || isAuthLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-destructive">{error}</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-muted-foreground">Nenhum dado encontrado.</p>
        </div>
      );
    }


    const { kpis } = data.kpi;
    const { tasksCompletedByTimeRangeDTOS } = data.charts;

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 my-6">
          <KpiCard
            title="Tarefas Concluídas (Este Mês)"
            value={kpis.completedTasks.value.toString()}
            change={kpis.completedTasks.change}
            description={kpis.completedTasks.description}
            additionalDescription={kpis.completedTasks.additionalDescription}
          />
          <KpiCard
            title="Taxa de Produtividade (Semanal)"
            value={`${kpis.productivityRate.value.toFixed(0)}%`} 
            change={kpis.productivityRate.change}
            description={kpis.productivityRate.description}
            additionalDescription={kpis.productivityRate.additionalDescription}
          />
          <KpiCard
            title="Projetos Ativos"
            value={kpis.activeProjects.value.toString()}
            description={kpis.activeProjects.description}
            additionalDescription={kpis.activeProjects.additionalDescription}
          />
          <KpiCard
            title="Tarefas Atrasadas"
            value={kpis.overdueTasks.value.toString()}
            change={kpis.overdueTasks.change}
            description={kpis.overdueTasks.description}
            additionalDescription={kpis.overdueTasks.additionalDescription}
          />
        </div>

        <div className="grid gap-6">
          <ReusableLineChartCard
            title="Tarefas Concluídas"
            description="Evolução de tarefas concluídas ao longo do tempo."
            fullData={tasksCompletedByTimeRangeDTOS} 
            dataKey="completed"
            chartConfig={tasksChartConfig}
          />
        </div>
      </>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-muted/40">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">
                Estatísticas
              </h1>
            </div>

            {renderContent()}

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
