import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeftRight, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestmentMovements, useInvestmentValuations } from '@/hooks/useInvestments';
import { formatCurrency } from '@/lib/format';
import { ASSET_CLASS, lastValuationText, POSITION_STATUS } from '@/lib/investments';
import { centsAmount, moneyCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Investment, Movement, Valuation } from '@/types/investment';
import { MovementList } from './MovementList';

interface InvestmentDetailProps {
  investment: Investment | null;
  onOpenChange: (open: boolean) => void;
  onValuate: (investment: Investment, valuation?: Valuation) => void;
  onDeleteValuation: (valuation: Valuation) => void;
  onMove: (investment: Investment, movement?: Movement) => void;
  onDeleteMovement: (movement: Movement) => void;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
}

/** Position, valuation history and movements of one investment, with the actions that change them. */
export function InvestmentDetail({ investment, onOpenChange, ...actions }: InvestmentDetailProps) {
  return (
    <ResponsiveDialog open={investment !== null} onOpenChange={onOpenChange} className="sm:max-w-[600px]"
      title={investment?.name ?? 'Aplicação'}
      description={investment ? `${ASSET_CLASS[investment.assetClass]} · ${lastValuationText(investment)}` : undefined}>
      {investment && <DetailBody key={investment.id} investment={investment} {...actions} />}
    </ResponsiveDialog>
  );
}

function DetailBody({ investment, onValuate, onDeleteValuation, onMove, onDeleteMovement, onEdit, onDelete }:
  Omit<InvestmentDetailProps, 'investment' | 'onOpenChange'> & { investment: Investment }) {
  const [movementPage, setMovementPage] = useState(0);
  const valuations = useInvestmentValuations(investment.id);
  const movements = useInvestmentMovements({ investmentId: investment.id, page: movementPage });
  const status = POSITION_STATUS[investment.positionStatus];
  const names = new Map([[investment.id, investment.name]]);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="position-heading" className="rounded-lg border p-4">
        <h3 id="position-heading" className="text-xs text-muted-foreground">Posição na carteira</h3>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {investment.position === null ? status.label : formatCurrency(investment.position)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{status.label}: {status.hint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onValuate(investment)}><RefreshCw aria-hidden />Atualizar avaliação</Button>
          <Button size="sm" variant="outline" onClick={() => onMove(investment)}><ArrowLeftRight aria-hidden />Registrar movimento</Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(investment)}><Pencil aria-hidden />Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(investment)}><Trash2 aria-hidden />Excluir</Button>
        </div>
      </section>

      <section aria-labelledby="valuations-heading" className="flex flex-col gap-2">
        <h3 id="valuations-heading" className="text-sm font-semibold">Histórico de avaliações</h3>
        <p className="text-xs text-muted-foreground">
          A variação compara o valor informado com a avaliação anterior e inclui aportes e resgates do intervalo. Não é rentabilidade.
        </p>
        {valuations.isPending ? <Skeleton className="h-16 w-full" />
          : valuations.isError ? <WorkFeedback error={valuations.error} retry={() => void valuations.refetch()} />
          : valuations.data.content.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhuma avaliação. Informe uma para incluir a aplicação no total.</p>
            : <ValuationHistory valuations={valuations.data.content}
                onEdit={valuation => onValuate(investment, valuation)} onDelete={onDeleteValuation} />}
      </section>

      <section aria-labelledby="movements-heading" className="flex flex-col gap-2">
        <h3 id="movements-heading" className="text-sm font-semibold">Movimentos</h3>
        {movements.isPending ? <Skeleton className="h-16 w-full" />
          : movements.isError ? <WorkFeedback error={movements.error} retry={() => void movements.refetch()} />
          : movements.data.content.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhum aporte, resgate ou rendimento registrado.</p>
            : <MovementList page={movements.data} names={names} showInvestment={false}
                onEdit={movement => onMove(investment, movement)} onDelete={onDeleteMovement} onPageChange={setMovementPage} />}
      </section>
    </div>
  );
}

function ValuationHistory({ valuations, onEdit, onDelete }: {
  valuations: Valuation[]; onEdit: (valuation: Valuation) => void; onDelete: (valuation: Valuation) => void;
}) {
  return (
    <ul className="-mx-2 flex flex-col divide-y">
      {valuations.map((valuation, index) => {
        const previous = valuations[index + 1];
        const change = previous ? moneyCents(valuation.amount) - moneyCents(previous.amount) : null;
        const day = format(parseISO(valuation.valuedOn), 'dd/MM/yyyy');
        return (
          <li key={valuation.id} className="flex items-center gap-3 px-2 py-2">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm tabular-nums">{day}</span>
              <span className="text-xs text-muted-foreground">
                {change === null ? 'Primeira avaliação'
                  : `Variação do valor informado: ${change > 0n ? '+' : ''}${formatCurrency(centsAmount(change))}`}
              </span>
            </span>
            <span className={cn('shrink-0 text-sm font-medium tabular-nums', index > 0 && 'text-muted-foreground')}>
              {formatCurrency(valuation.amount)}
            </span>
            <span className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" className="h-10 w-10 md:h-8 md:w-8" aria-label={`Corrigir avaliação de ${day}`} onClick={() => onEdit(valuation)}>
                <Pencil aria-hidden className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-10 w-10 md:h-8 md:w-8" aria-label={`Excluir avaliação de ${day}`} onClick={() => onDelete(valuation)}>
                <Trash2 aria-hidden className="size-4 text-muted-foreground" />
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
