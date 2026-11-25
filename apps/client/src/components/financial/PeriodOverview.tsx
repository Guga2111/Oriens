import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { WorkFeedback } from "@/components/common/WorkFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  byTag,
  entriesInMonth,
  summarizeMonth,
  summarizeThrough,
  transfersInMonth,
  weeklyFlow,
  type FinancialPeriod,
} from "@/lib/financialSummary";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EntryDTO, TagDTO } from "@/types/financial";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { MonthFlowChart } from "./MonthFlowChart";

interface PeriodOverviewProps {
  /** Histórico completo da conta; ausente enquanto carrega ou após falha. */
  entries: EntryDTO[] | undefined;
  tags: TagDTO[];
  period: FinancialPeriod;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onNewEntry: () => void;
  onSelectCategory: (tagId: number) => void;
  onViewMonth: () => void;
}

const MASKED_VALUE = "R$ ••••••";

/**
 * Visão geral do mês: receitas, despesas e resultado do mês selecionado, saldo
 * disponível acumulado até o fim dele e a composição das despesas.
 */
export function PeriodOverview({
  entries,
  tags,
  period,
  isLoading,
  error,
  onRetry,
  onNewEntry,
  onSelectCategory,
  onViewMonth,
}: PeriodOverviewProps) {
  const [showValues, setShowValues] = useState(true);

  const overview = useMemo(() => {
    if (!entries) return null;
    const monthEntries = entriesInMonth(entries, period);
    return {
      hasEntries: monthEntries.length > 0,
      month: summarizeMonth(entries, period),
      available: summarizeThrough(entries, period),
      transfers: transfersInMonth(entries, period),
      categories: byTag(monthEntries, tags),
      weeks: weeklyFlow(monthEntries),
    };
  }, [entries, tags, period]);

  const periodDate = new Date(period.year, period.month, 1);
  const monthName = format(periodDate, "MMMM", { locale: ptBR });
  const monthEnd = format(new Date(period.year, period.month + 1, 0), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const mask = (value: string) => (showValues ? value : MASKED_VALUE);

  if (isLoading) {
    return (
      <section aria-label="Resumo do mês" aria-busy="true">
        <OverviewSkeleton />
      </section>
    );
  }

  // Sem histórico completo, nenhum total aparece: um valor parcial pareceria definitivo.
  if (!overview) {
    return (
      <section aria-label="Resumo do mês">
        <WorkFeedback
          error={error}
          message={error ? undefined : "Não foi possível calcular o resumo."}
          retry={onRetry}
          retryLabel="Tentar novamente"
        />
      </section>
    );
  }

  const { month, available, transfers } = overview;
  const hasTransfers = transfers.contributions > 0 || transfers.withdrawals > 0;
  const transferTag = transfers.tagId;

  return (
    <section aria-label="Resumo do mês" className="flex flex-col gap-6">
      {error ? (
        <WorkFeedback
          message="Não foi possível atualizar os dados. Os valores exibidos são da última leitura completa."
          retry={onRetry}
          retryLabel="Tentar novamente"
        />
      ) : null}
      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          {/* The header already shows the month; the heading only names the region for screen readers. */}
          <h2 className="sr-only">Resumo de {monthName}</h2>
          <dl className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric label="Receitas" hint="No mês selecionado" className="text-positive">
              {mask(formatCurrency(month.income))}
            </Metric>
            <Metric label="Despesas" hint="No mês selecionado" className="text-negative">
              {mask(formatCurrency(month.expenses))}
            </Metric>
            <Metric
              label="Resultado do mês"
              hint="Receitas menos despesas"
              className={cn(month.balance < 0 && "text-negative")}
            >
              {mask(formatCurrency(month.balance))}
            </Metric>
            <Metric
              label="Saldo disponível"
              hint={`Acumulado até ${monthEnd}, com aportes e resgates`}
              className={cn(available.balance < 0 && "text-negative")}
            >
              {mask(formatCurrency(available.balance))}
            </Metric>
          </dl>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowValues((visible) => !visible)}
            aria-label={showValues ? "Ocultar valores" : "Exibir valores"}
            className="-mr-2 -mt-2 shrink-0"
          >
            {showValues ? <Eye className="h-5 w-5" aria-hidden /> : <EyeOff className="h-5 w-5" aria-hidden />}
          </Button>
        </CardContent>
      </Card>

      {hasTransfers ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">Transferências de investimentos</h2>
              <p className="text-xs text-muted-foreground">
                Movem o saldo disponível sem entrar em receitas, despesas ou no resultado do mês.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 sm:flex sm:gap-6">
              <Metric label="Aportes" hint="Saíram do saldo" className="text-base">
                {mask(formatCurrency(transfers.contributions))}
              </Metric>
              <Metric label="Resgates" hint="Voltaram ao saldo" className="text-base">
                {mask(formatCurrency(transfers.withdrawals))}
              </Metric>
              <Metric label="Efeito no saldo" hint="Resgates menos aportes"
                className={cn("text-base", transfers.net < 0 && "text-negative")}>
                {mask(formatCurrency(transfers.net))}
              </Metric>
            </dl>
            {transferTag !== null && (
              <Button variant="link" className="h-auto self-start px-0 sm:self-center"
                aria-label={`Ver transferências de ${monthName} no histórico, na tag Investimentos`}
                onClick={() => onSelectCategory(transferTag)}>
                Ver no histórico
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {overview.hasEntries ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-5 pb-3">
              <h2 className="text-base font-semibold">Despesas por categoria</h2>
              <Button variant="link" className="h-auto px-0" onClick={onViewMonth}>
                Ver lançamentos do mês
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CategoryBreakdown
                categories={overview.categories}
                monthName={monthName}
                onSelect={onSelectCategory}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-5 pb-3">
              <h2 className="text-base font-semibold">Receitas e despesas no mês</h2>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <MonthFlowChart weeks={overview.weeks} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyTitle className="text-base">Nenhum lançamento em {monthName}</EmptyTitle>
                <EmptyDescription>
                  Registre uma receita ou uma despesa para ver a composição deste mês.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={onNewEntry}>Nova entrada</Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Metric({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint: string;
  className?: string;
  children: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-xl font-semibold tabular-nums", className)}>{children}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
