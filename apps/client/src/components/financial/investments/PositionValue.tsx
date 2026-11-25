import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { POSITION_STATUS } from '@/lib/investments';
import type { Investment } from '@/types/investment';

/** Position with its meaning: a value only exists for valued or estimated investments. */
export function PositionValue({ investment }: { investment: Investment }) {
  const status = POSITION_STATUS[investment.positionStatus];
  return (
    <span className="flex flex-col items-end gap-1 text-right">
      <span className="font-medium tabular-nums">{investment.position === null ? '—' : formatCurrency(investment.position)}</span>
      {investment.positionStatus !== 'VALUED' && <Badge variant={status.badge} className="font-normal">{status.label}</Badge>}
    </span>
  );
}
