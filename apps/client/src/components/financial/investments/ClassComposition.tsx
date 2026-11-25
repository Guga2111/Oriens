import { formatCurrency } from '@/lib/format';
import { ASSET_CLASS, classShares, coverageText } from '@/lib/investments';
import type { InvestmentSummary } from '@/types/investment';

/** Share of each class in the covered total. Values and percentages are text; the bar only echoes them. */
export function ClassComposition({ summary }: { summary: InvestmentSummary }) {
  const shares = classShares(summary.composition);
  if (shares.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Nenhuma aplicação com posição para compor a carteira.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {shares.map(share => (
          <li key={share.assetClass} className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                {ASSET_CLASS[share.assetClass]}
                <span className="text-xs text-muted-foreground"> · {share.investments} {share.investments === 1 ? 'aplicação' : 'aplicações'}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(share.total)} <span className="text-xs text-muted-foreground">· {share.percent}%</span>
              </span>
            </span>
            <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${share.percent}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{coverageText(summary)}.</p>
    </div>
  );
}
