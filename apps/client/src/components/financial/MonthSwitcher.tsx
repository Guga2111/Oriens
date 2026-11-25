import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinancialPeriod } from "@/lib/financialSummary";

interface MonthSwitcherProps {
  period: FinancialPeriod;
  current: FinancialPeriod;
  onChange: (period: FinancialPeriod) => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Compact month navigation for the app header; "Este mês" appears only away from it. */
export function MonthSwitcher({ period, current, onChange }: MonthSwitcherProps) {
  const date = new Date(period.year, period.month, 1);
  const move = (months: number) => {
    const next = addMonths(date, months);
    onChange({ month: next.getMonth(), year: next.getFullYear() });
  };
  const isCurrent = period.month === current.month && period.year === current.year;

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Mês selecionado">
      <Button variant="ghost" size="icon" className="size-8 max-md:size-10" aria-label="Mês anterior" onClick={() => move(-1)}>
        <ChevronLeft aria-hidden />
      </Button>
      <span className="min-w-[4.5rem] text-center text-sm font-medium tabular-nums md:min-w-[8.5rem]" aria-live="polite">
        <span className="max-md:hidden">{capitalize(format(date, "MMMM yyyy", { locale: ptBR }))}</span>
        <span className="md:hidden">{capitalize(format(date, "MMM yy", { locale: ptBR }))}</span>
      </span>
      <Button variant="ghost" size="icon" className="size-8 max-md:size-10" aria-label="Próximo mês" onClick={() => move(1)}>
        <ChevronRight aria-hidden />
      </Button>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={() => onChange(current)}>
          Este mês
        </Button>
      )}
    </div>
  );
}
