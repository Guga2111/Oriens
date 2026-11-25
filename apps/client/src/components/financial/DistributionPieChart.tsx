import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { byTag, summarizeAll } from "@/lib/financialSummary";
import { formatCurrency } from "@/lib/format";
import type { EntryDTO, TagDTO } from "@/types/financial";

interface DistributionPieChartProps {
  /** Entradas do mês selecionado. */
  entries: EntryDTO[];
  tags: TagDTO[];
  isLoading?: boolean;
}

interface DistributionSlice {
  key: string;
  name: string;
  amount: number;
  color: string;
}

const chartConfig: ChartConfig = {
  amount: { label: "Valor", color: "hsl(var(--chart-1))" },
};

const FREE_BALANCE_COLOR = "hsl(var(--chart-3))";

/**
 * Distribuição do mês (SPEC §11.5): anel fino com o total no centro e legenda
 * em tabela. "Saldo livre" usa --chart-3 e só aparece quando sobra dinheiro.
 */
export function DistributionPieChart({
  entries,
  tags,
  isLoading = false,
}: DistributionPieChartProps) {
  const { slices, total } = useMemo(() => {
    const summary = summarizeAll(entries);
    const nextSlices: DistributionSlice[] = byTag(entries, tags).map((tag) => ({
      key: `tag-${tag.tagId}`,
      name: tag.name,
      amount: tag.amount,
      color: tag.color,
    }));

    if (summary.balance > 0) {
      nextSlices.push({
        key: "saldo-livre",
        name: "Saldo livre",
        amount: summary.balance,
        color: FREE_BALANCE_COLOR,
      });
    }

    return {
      slices: nextSlices,
      total: nextSlices.reduce((sum, slice) => sum + slice.amount, 0),
    };
  }, [entries, tags]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-5 pb-3">
        <h2 className="text-base font-semibold">Distribuição do mês</h2>
      </CardHeader>
      <CardContent className="flex-1 p-5 pt-0">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : slices.length === 0 ? (
          <Empty className="border-0 p-0">
            <EmptyHeader>
              <EmptyTitle className="text-sm font-normal text-muted-foreground">
                Nenhum gasto neste mês.
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex h-full flex-col items-center gap-4 xl:flex-row">
            <div className="relative h-[220px] w-[220px] shrink-0">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={76}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.key} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <Table className="min-w-0">
              <TableCaption className="sr-only">
                Distribuição do mês por tag
              </TableCaption>
              <TableHeader className="sr-only">
                <TableRow>
                  <TableHead scope="col">Tag</TableHead>
                  <TableHead scope="col">Valor</TableHead>
                  <TableHead scope="col">Porcentagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slices.map((slice) => (
                  <TableRow key={slice.key} className="border-0 hover:bg-transparent">
                    <TableHead scope="row" className="h-auto px-0 py-1 font-normal text-foreground">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate">{slice.name}</span>
                      </span>
                    </TableHead>
                    <TableCell className="py-1 pl-2 pr-0 text-right tabular-nums">
                      {formatCurrency(slice.amount)}
                    </TableCell>
                    <TableCell className="w-14 px-0 py-1 text-right tabular-nums text-muted-foreground">
                      {total > 0
                        ? `${((slice.amount / total) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
