import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  entriesInMonth,
  summarizeAll,
  summarizeMonth,
  type FinancialPeriod,
} from "@/lib/financialSummary";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EntryDTO } from "@/types/financial";

interface PeriodOverviewProps {
  /** Histórico carregado até o momento (o acumulado cresce conforme chega). */
  entries: EntryDTO[];
  period: FinancialPeriod;
  /** Primeira página ainda não chegou: o mês inteiro está em skeleton. */
  isLoadingMonth: boolean;
  /** Carga completa do histórico em andamento: só o acumulado fica em skeleton. */
  isLoadingAccumulated: boolean;
  onNewEntry: () => void;
  /** Ação "Ver outro mês" do estado vazio. */
  onPreviousMonth: () => void;
}

const MASKED_VALUE = "R$ ••••••";

/**
 * Resumo do mês selecionado (SPEC §11.5, D3): saldo como figura principal,
 * receitas/gastos com sinal e o saldo acumulado como linha secundária.
 */
export function PeriodOverview({
  entries,
  period,
  isLoadingMonth,
  isLoadingAccumulated,
  onNewEntry,
  onPreviousMonth,
}: PeriodOverviewProps) {
  const [showValues, setShowValues] = useState(true);

  const monthEntries = useMemo(
    () => entriesInMonth(entries, period),
    [entries, period]
  );
  const monthSummary = useMemo(
    () => summarizeMonth(entries, period),
    [entries, period]
  );
  const accumulated = useMemo(() => summarizeAll(entries), [entries]);

  const monthName = format(new Date(period.year, period.month, 1), "MMMM", {
    locale: ptBR,
  });

  const mask = (value: string) => (showValues ? value : MASKED_VALUE);

  return (
    <section aria-labelledby="financial-overview-heading" aria-busy={isLoadingMonth}>
      <h2 id="financial-overview-heading" className="sr-only">
        Resumo do mês
      </h2>
      <Card>
        <CardContent className="p-5">
          {isLoadingMonth ? (
            <OverviewSkeleton />
          ) : monthEntries.length === 0 ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyTitle className="text-base">
                  Nenhuma entrada em {monthName}
                </EmptyTitle>
                <EmptyDescription>
                  Registre uma receita ou um gasto para ver o resumo e os
                  gráficos deste mês.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={onNewEntry}>Nova entrada</Button>
                  <Button variant="outline" onClick={onPreviousMonth}>
                    Ver outro mês
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Saldo do mês</p>
                  <p
                    className={cn(
                      "mt-1 text-[2rem] font-semibold leading-9 tabular-nums tracking-tight",
                      monthSummary.balance < 0 && "text-negative"
                    )}
                  >
                    {mask(formatCurrency(monthSummary.balance))}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowValues((visible) => !visible)}
                  aria-label={showValues ? "Ocultar valores" : "Exibir valores"}
                  className="shrink-0"
                >
                  {showValues ? (
                    <Eye className="h-5 w-5" aria-hidden />
                  ) : (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Receitas do mês
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-positive">
                    {mask(`+ ${formatCurrency(monthSummary.income)}`)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Gastos do mês</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-negative">
                    {mask(`− ${formatCurrency(monthSummary.expenses)}`)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span>Saldo acumulado:</span>
                {isLoadingAccumulated ? (
                  <Skeleton
                    className="inline-block h-3 w-24 align-middle"
                    data-testid="accumulated-skeleton"
                  />
                ) : (
                  <span className="font-medium tabular-nums text-foreground">
                    {mask(formatCurrency(accumulated.balance))}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-44" />
        </div>
        <Skeleton className="h-9 w-9" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <Skeleton className="h-3 w-56" />
    </div>
  );
}
