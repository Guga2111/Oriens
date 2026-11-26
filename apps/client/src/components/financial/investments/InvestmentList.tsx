import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ASSET_CLASS, lastValuationText, POSITION_STATUS } from '@/lib/investments';
import { formatCurrency } from '@/lib/format';
import type { Investment } from '@/types/investment';
import { PositionValue } from './PositionValue';

/** Each row opens the investment detail; the date of the last valuation travels with every position. */
export function InvestmentList({ investments, onOpen }: { investments: Investment[]; onOpen: (investment: Investment) => void }) {
  return (
    <ul className="-mx-2 flex flex-col">
      {investments.map(investment => {
        const position = investment.position === null ? POSITION_STATUS[investment.positionStatus].label : formatCurrency(investment.position);
        return (
          <li key={investment.id}>
            <Button type="button" variant="ghost" onClick={() => onOpen(investment)}
              aria-label={`${investment.name}, ${ASSET_CLASS[investment.assetClass]}. Posição ${position}, ${POSITION_STATUS[investment.positionStatus].label.toLowerCase()}. ${lastValuationText(investment)}. Ver detalhes.`}
              className="h-auto w-full justify-start gap-3 whitespace-normal px-2 py-2.5 text-left font-normal max-md:min-h-14">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{investment.name}</span>
                {/* The valuation date never truncates: every position is read with its date. */}
                <span className="flex flex-wrap gap-x-1 text-xs text-muted-foreground">
                  <span>{ASSET_CLASS[investment.assetClass]} ·</span>
                  <span className="whitespace-nowrap">{lastValuationText(investment)}</span>
                </span>
              </span>
              <PositionValue investment={investment} />
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
