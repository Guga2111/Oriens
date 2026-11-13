import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  KpiStrip,
  type KpiStripItem,
} from "@/components/statistics/KpiStrip";
import { ReusableLineChartCard } from "@/components/statistics/ReusableLineChartCard";
import { Button } from "@/components/ui/button";
import { ChartConfig } from "@/components/ui/chart";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getDashboardData } from "@/services/api";
import { DashboardData } from "@/types/statistics";
import { useAuth } from "@/context/AuthContext";

const tasksChartConfig = {
  completed: {
    label: "Tarefas concluídas",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function StatisticsPage() {
  const { userId, isLoading: isAuthLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const fetchedData = await getDashboardData(userId);
      setData(fetchedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar as estatísticas.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!userId) {
      setError("Usuário não autenticado.");
      setIsLoading(false);
      return;
    }

    void loadData();
  }, [isAuthLoading, userId, loadData]);

  const kpiItems = useMemo<KpiStripItem[]>(() => {
    if (!data) return [];

    const { kpis } = data.kpi;

    return [
      {
        label: "Tarefas concluídas (este mês)",
        value: kpis.completedTasks.value.toString(),
        change: kpis.completedTasks.change,
        goodDirection: "up",
        description: kpis.completedTasks.description,
        additionalDescription: kpis.completedTasks.additionalDescription,
      },
      {
        label: "Taxa de produtividade (semanal)",
        value: `${kpis.productivityRate.value}%`,
        change: kpis.productivityRate.change,
        goodDirection: "up",
        description: kpis.productivityRate.description,
        additionalDescription: kpis.productivityRate.additionalDescription,
      },
      {
        label: "Projetos ativos",
        value: kpis.activeProjects.value.toString(),
        change: kpis.activeProjects.change,
        goodDirection: "up",
        description: kpis.activeProjects.description,
        additionalDescription: kpis.activeProjects.additionalDescription,
      },
      {
        label: "Tarefas atrasadas",
        value: kpis.overdueTasks.value.toString(),
        change: kpis.overdueTasks.change,
        goodDirection: "down",
        description: kpis.overdueTasks.description,
        additionalDescription: kpis.overdueTasks.additionalDescription,
      },
    ];
  }, [data]);

  const showError = !isLoading && !data;

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Estatísticas" />

      <div className="mt-6 flex flex-col gap-6">
        {showError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                Não foi possível carregar as estatísticas
              </EmptyTitle>
              <EmptyDescription>
                {error ?? "Nenhum dado encontrado."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => void loadData()}>Tentar novamente</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <KpiStrip items={kpiItems} isLoading={isLoading} />

            <ReusableLineChartCard
              title="Tarefas concluídas"
              description="Evolução de tarefas concluídas ao longo do tempo."
              fullData={data?.charts.tasksCompletedByTimeRangeDTOS ?? []}
              dataKey="completed"
              chartConfig={tasksChartConfig}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
