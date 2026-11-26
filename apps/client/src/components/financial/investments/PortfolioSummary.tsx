import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { coverageText } from '@/lib/investments';
import { cn } from '@/lib/utils';
import type { InvestmentSummary } from '@/types/investment';

export function PortfolioSummary({ summary }: { summary: InvestmentSummary }) {
  const partial = summary.covered < summary.investments;
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="sr-only">Resumo da carteira</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric label="Valor da carteira" hint={coverageText(summary)} hintClassName={cn(partial && 'text-foreground')}>
            {formatCurrency(summary.total)}
          </Metric>
          <Metric label="Aportes líquidos" hint="Aportes menos resgates registrados">
            {formatCurrency(summary.netContributions)}
          </Metric>
          <Metric label="Rendimentos recebidos" hint="Entraram no caixa como receita" className="text-positive">
            {formatCurrency(summary.incomeReceived)}
          </Metric>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Cada posição parte da última avaliação informada e soma os aportes e resgates posteriores. A carteira não calcula
          rentabilidade: aportes e resgates são fluxos de dinheiro, não ganho ou perda.
        </p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, hint, className, hintClassName, children }: {
  label: string; hint: string; className?: string; hintClassName?: string; children: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 text-xl font-semibold tabular-nums', className)}>{children}</dd>
      <dd className={cn('mt-0.5 text-xs text-muted-foreground', hintClassName)}>{hint}</dd>
    </div>
  );
}
