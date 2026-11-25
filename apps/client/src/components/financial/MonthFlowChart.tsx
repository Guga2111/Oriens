import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { WeekFlow } from "@/lib/financialSummary";

const chartConfig = {
  income: { label: "Receitas", color: "hsl(var(--chart-1))" },
  expenses: { label: "Despesas", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

const compactMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

/** Receitas e despesas do mês por faixa de dias, com os valores exatos em tabela. */
export function MonthFlowChart({ weeks }: { weeks: WeekFlow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2 bg-chart-1" aria-hidden />
          Receitas
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 bg-muted-foreground" aria-hidden />
          Despesas
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="h-[180px] w-full"
        role="img"
        aria-label="Receitas e despesas do mês por semana. Valores disponíveis na tabela."
      >
        <BarChart
          accessibilityLayer
          data={weeks}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
            tickFormatter={compactMoney}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span>{name === "income" ? "Receitas" : "Despesas"}</span>
                    <span className="tabular-nums">
                      {formatCurrency(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="income"
            fill="var(--color-income)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expenses"
            fill="var(--color-expenses)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="link" className="h-auto px-0">
            Ver valores por semana
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dias</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeks.map((week) => (
                <TableRow key={week.label}>
                  <TableCell>{week.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(week.income)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(week.expenses)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
