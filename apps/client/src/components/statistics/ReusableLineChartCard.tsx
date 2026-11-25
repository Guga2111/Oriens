import { useMemo, useState } from "react";
import { addDays, differenceInDays, format, startOfDay, subDays, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { parseLocalDate } from "@/lib/date";
import { getChartLineColor } from "./chartLineColor";
import { integerTicks, pickDateTicks } from "./chartTicks";

interface ReusableLineChartCardProps<T extends { date: string }> {
  title: string;
  description: string;
  fullData: T[];
  dataKey: Extract<keyof T, string>;
  chartConfig: ChartConfig;
  isLoading?: boolean;
}

type FilterPeriod = "7days" | "30days" | "year";

function periodStart(filter: FilterPeriod): Date {
  const today = startOfDay(new Date());

  if (filter === "7days") return subDays(today, 6);
  if (filter === "30days") return subDays(today, 29);
  return subYears(today, 1);
}

/**
 * Linha de 2 px em `--chart-1`, segmentos retos, 4 gridlines horizontais e
 * ticks inteiros (SPEC §11.6). Sem dados, desenha uma linha zero e a frase
 * honesta; o loading fica dentro do canvas.
 */
export function ReusableLineChartCard<T extends { date: string }>({
  title,
  description,
  fullData,
  dataKey,
  chartConfig,
  isLoading = false,
}: ReusableLineChartCardProps<T>) {
  const [filter, setFilter] = useState<FilterPeriod>("30days");

  const filteredData = useMemo(() => {
    const today = startOfDay(new Date());
    const cutoff = periodStart(filter);

    return [...(fullData ?? [])]
      .map((point) => ({ point, date: parseLocalDate(point.date) }))
      .filter(
        (entry): entry is { point: T; date: Date } =>
          !!entry.date && entry.date >= cutoff && entry.date <= today
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((entry) => entry.point);
  }, [fullData, filter]);

  const hasActivity = filteredData.some(
    (point) => Number(point[dataKey] ?? 0) > 0
  );

  const chartData = useMemo(() => {
    if (filteredData.length > 0) return filteredData;

    const today = startOfDay(new Date());
    const start = periodStart(filter);
    const totalDays = Math.max(1, differenceInDays(today, start));

    // Série sintética de 4 pontos para a linha zero do estado vazio, mantendo
    // de 4 a 8 rótulos no eixo X (SPEC §11.6).
    return Array.from({ length: 4 }, (_, index) => ({
      date: format(
        addDays(start, Math.round((totalDays * index) / 3)),
        "yyyy-MM-dd"
      ),
      [dataKey]: 0,
    })) as unknown as T[];
  }, [filteredData, filter, dataKey]);

  const yTicks = useMemo(
    () =>
      integerTicks(
        Math.max(...chartData.map((point) => Number(point[dataKey] ?? 0)), 0)
      ),
    [chartData, dataKey]
  );
  const xTicks = useMemo(() => pickDateTicks(chartData), [chartData]);
  const lineColor = getChartLineColor(chartConfig, dataKey);

  const formatDateTick = (value: string) => {
    const date = parseLocalDate(value);
    if (!date) return value;

    return format(date, filter === "year" ? "MMM" : "dd/MM", {
      locale: ptBR,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => value && setFilter(value as FilterPeriod)}
          className="gap-1 self-start"
          size="sm"
          aria-label="Período do gráfico"
        >
          <ToggleGroupItem value="7days" aria-label="Últimos 7 dias">
            7D
          </ToggleGroupItem>
          <ToggleGroupItem value="30days" aria-label="Últimos 30 dias">
            30D
          </ToggleGroupItem>
          <ToggleGroupItem value="year" aria-label="Último ano">
            1A
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div
            className="h-[320px] w-full"
            role="status"
            aria-label="Carregando gráfico"
          >
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <>
            {!hasActivity && (
              <p className="mb-2 text-sm text-muted-foreground">
                Nenhuma tarefa concluída neste período
              </p>
            )}

            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 12, right: 24, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  ticks={xTicks}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatDateTick}
                />
                <YAxis
                  domain={[0, Math.max(...yTicks)]}
                  ticks={yTicks}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tickMargin={4}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) => formatDateTick(String(value))}
                    />
                  }
                />
                <Line
                  dataKey={dataKey}
                  type="linear"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={
                    chartData.length <= 7
                      ? { r: 2, fill: lineColor, strokeWidth: 0 }
                      : false
                  }
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
