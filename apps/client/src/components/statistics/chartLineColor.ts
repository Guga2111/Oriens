import type { ChartConfig } from "@/components/ui/chart";

/**
 * A5 (P0.3): a linha do gráfico usa a cor do token `--chart-*` da configuração
 * passada pela página, nunca `--primary` — sem isso a série fica sem a cor
 * definida para ela. Módulo próprio para não misturar export não-componente
 * com o componente (react-refresh).
 */
export function getChartLineColor(
  chartConfig: ChartConfig,
  dataKey: string
): string {
  return chartConfig[dataKey]?.color ?? "hsl(var(--chart-1))";
}
