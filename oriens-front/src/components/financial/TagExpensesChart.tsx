import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { byTag } from "@/lib/financialSummary";
import { formatCurrency } from "@/lib/format";
import type { EntryDTO, TagDTO } from "@/types/financial";

interface TagExpensesChartProps {
  /** Entradas do mês selecionado. */
  entries: EntryDTO[];
  tags: TagDTO[];
  isLoading?: boolean;
}

const chartConfig: ChartConfig = {
  amount: { label: "Gastos", color: "hsl(var(--chart-1))" },
};

/**
 * Gastos do mês por tag (SPEC §11.5): barras horizontais ordenadas, na cor da
 * tag, com o valor à direita. Sem gastos, a frase ocupa a altura natural do
 * card em vez de reservar 300 px vazios.
 */
export function TagExpensesChart({
  entries,
  tags,
  isLoading = false,
}: TagExpensesChartProps) {
  const data = useMemo(
    () =>
      byTag(entries, tags).map((tag) => ({
        key: `tag-${tag.tagId}`,
        name: tag.name,
        amount: tag.amount,
        fill: tag.color,
      })),
    [entries, tags]
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-5 pb-3">
        <h2 className="text-base font-semibold">Gastos por tag</h2>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-5 pt-0">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data.length === 0 ? (
          <Empty className="border-0 p-0">
            <EmptyHeader>
              <EmptyTitle className="text-sm font-normal text-muted-foreground">
                Nenhum gasto neste mês.
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-full min-h-[160px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 96, bottom: 4, left: 0 }}
            >
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Bar
                dataKey="amount"
                barSize={16}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell key={item.key} fill={item.fill} />
                ))}
                <LabelList
                  dataKey="amount"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
