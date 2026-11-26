import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { HeaderActions } from "@/components/common/HeaderActions";
import { Button } from "@/components/ui/button";
import { CreateEntryDialog } from "@/components/financial/CreateEntryDialog";
import { MonthSwitcher } from "@/components/financial/MonthSwitcher";
import { PeriodOverview } from "@/components/financial/PeriodOverview";
import { useFinancialLedger, useFinancialTags } from "@/hooks/useFinancial";
import { useProductToday } from "@/hooks/useProductToday";
import { entriesPath, periodFromParam, periodParam } from "@/lib/financial-route";
import type { FinancialPeriod } from "@/lib/financialSummary";

/** Visão geral do Financeiro; o mês fica na URL para sobreviver à ida ao histórico e à volta. */
export default function FinancialPage() {
  const navigate = useNavigate();
  const today = useProductToday();
  const [params, setParams] = useSearchParams();
  const period = periodFromParam(params.get("month"), today);
  const current = periodFromParam(null, today);
  const ledger = useFinancialLedger();
  const tags = useFinancialTags();
  const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);

  const changePeriod = (next: FinancialPeriod) =>
    setParams(
      (previous) => {
        const nextParams = new URLSearchParams(previous);
        nextParams.set("month", periodParam(next));
        return nextParams;
      },
      { replace: true }
    );

  return (
    <div className="min-w-0 w-full">
      {/* The breadcrumb names the page, as on Projetos; the h1 stays for screen readers. */}
      <h1 className="sr-only">Financeiro</h1>
      <HeaderActions>
        <MonthSwitcher period={period} current={current} onChange={changePeriod} />
        <Button size="sm" onClick={() => setIsCreateEntryOpen(true)}>
          <Plus aria-hidden />
          <span className="max-md:sr-only">Nova entrada</span>
        </Button>
      </HeaderActions>

      <PeriodOverview
        entries={ledger.data}
        tags={tags.data ?? []}
        period={period}
        isLoading={ledger.isPending}
        error={ledger.error}
        onRetry={() => void ledger.refetch()}
        onNewEntry={() => setIsCreateEntryOpen(true)}
        onSelectCategory={(tagId) => navigate(entriesPath(period, tagId))}
        onViewMonth={() => navigate(entriesPath(period))}
      />

      <CreateEntryDialog
        open={isCreateEntryOpen}
        onOpenChange={setIsCreateEntryOpen}
        tags={tags.data ?? []}
        onSuccess={() => {}}
      />
    </div>
  );
}
