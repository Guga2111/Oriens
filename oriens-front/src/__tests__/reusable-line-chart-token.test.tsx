import { describe, expect, it } from "vitest";
import type { ChartConfig } from "@/components/ui/chart";
import { getChartLineColor } from "@/components/statistics/chartLineColor";

const tasksChartConfig = {
  completed: {
    label: "Tarefas Concluídas",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// A5 (P0.3): a linha do gráfico usava --primary em vez do token --chart-*
// definido para a série.
describe("ReusableLineChartCard — A5 token de cor", () => {
  it("usa a cor do token --chart-* da configuração da série", () => {
    expect(getChartLineColor(tasksChartConfig, "completed")).toBe(
      "hsl(var(--chart-1))"
    );
    expect(getChartLineColor(tasksChartConfig, "completed")).not.toBe(
      "hsl(var(--primary))"
    );
  });

  it("sem cor na config, cai no token --chart-1 (nunca em --primary)", () => {
    expect(getChartLineColor({}, "completed")).toBe("hsl(var(--chart-1))");
  });
});
