import { useMemo } from "react";
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
import { useWorkStatistics } from "@/hooks/useWork";

const tasksChartConfig = {
  completed: {
    label: "Tarefas concluídas",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function StatisticsPage() {
  const statistics = useWorkStatistics();
  const { data, isPending: isLoading } = statistics;
  const error = statistics.isError ? "Falha ao carregar as estatísticas." : null;
  const loadData = statistics.refetch;

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
        label: "Conclusão das tarefas planejadas",
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
        label: "Prazos ultrapassados",
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
        {statistics.isError && data && <div role="alert" className="text-sm">
          Não foi possível atualizar as estatísticas.
          <Button variant="link" onClick={() => void loadData()}>Tentar novamente</Button>
        </div>}
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
