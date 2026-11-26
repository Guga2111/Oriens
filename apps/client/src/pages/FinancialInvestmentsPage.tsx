import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { HeaderActions } from '@/components/common/HeaderActions';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useDeletion } from '@/hooks/useDraftSubmit';
import { useInvestmentMovements, useInvestments, useInvestmentSummary } from '@/hooks/useInvestments';
import { MOVEMENT_TYPE } from '@/lib/investments';
import { investmentService } from '@/services/investmentService';
import type { Investment, Movement, Valuation } from '@/types/investment';
import { ClassComposition } from '@/components/financial/investments/ClassComposition';
import { InvestmentDetail } from '@/components/financial/investments/InvestmentDetail';
import { InvestmentDialog } from '@/components/financial/investments/InvestmentDialog';
import { InvestmentList } from '@/components/financial/investments/InvestmentList';
import { MovementDialog } from '@/components/financial/investments/MovementDialog';
import { MovementList } from '@/components/financial/investments/MovementList';
import { PortfolioSummary } from '@/components/financial/investments/PortfolioSummary';
import { ValuationDialog } from '@/components/financial/investments/ValuationDialog';

type Removal =
  | { kind: 'investment'; item: Investment }
  | { kind: 'valuation'; item: Valuation }
  | { kind: 'movement'; item: Movement };

const day = (value: string) => format(parseISO(value), 'dd/MM/yyyy');

/** Manual portfolio: register investments, update valuations and record movements that reach the cash history. */
export default function FinancialInvestmentsPage() {
  const { userId } = useAuth();
  const [movementPage, setMovementPage] = useState(0);
  const investments = useInvestments(0);
  const summary = useInvestmentSummary();
  const movements = useInvestmentMovements({ page: movementPage });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [valuating, setValuating] = useState<{ investment: Investment; valuation?: Valuation } | null>(null);
  const [moving, setMoving] = useState<{ investmentId?: number; movement?: Movement } | null>(null);

  const list = investments.data?.content ?? [];
  const names = new Map(list.map(item => [item.id, item.name]));
  // The detail follows the refreshed list, so positions change in place after each write.
  const detail = list.find(item => item.id === detailId) ?? null;

  const removal = useDeletion(async (target: Removal, key: string) => {
    if (target.kind === 'investment') {
      await investmentService.remove(userId!, target.item.id, target.item.version, key);
      setDetailId(null);
      toast.success('Aplicação excluída', { description: 'Os lançamentos do histórico continuam lá, agora editáveis.' });
    } else if (target.kind === 'valuation') {
      await investmentService.removeValuation(userId!, target.item, key);
      toast.success('Avaliação excluída');
    } else {
      await investmentService.removeMovement(userId!, target.item, key);
      toast.success('Movimento excluído', { description: 'O lançamento vinculado saiu do histórico.' });
    }
  });

  const removalText = (target: Removal | null) => {
    if (!target) return { title: '', name: '', detail: '' };
    if (target.kind === 'investment') return {
      title: 'Excluir aplicação?', name: target.item.name,
      detail: 'Só é possível com a posição zerada ou sem movimentos. Os lançamentos do histórico permanecem.',
    };
    if (target.kind === 'valuation') return {
      title: 'Excluir avaliação?', name: `a avaliação de ${day(target.item.valuedOn)}`,
      detail: 'A posição volta a partir da avaliação anterior.',
    };
    return {
      title: 'Excluir movimento?', name: `o ${MOVEMENT_TYPE[target.item.type].label.toLowerCase()} de ${day(target.item.occurredOn)}`,
      detail: 'O lançamento vinculado também sai do histórico.',
    };
  };
  const text = removalText(removal.target);

  const loading = investments.isPending || summary.isPending;
  const failed = investments.error ?? summary.error;
  const empty = !loading && !failed && list.length === 0;

  return (
    <div className="min-w-0 w-full">
      <h1 className="sr-only">Investimentos</h1>
      <HeaderActions>
        {list.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setMoving({})}>
            <ArrowLeftRight aria-hidden />
            <span className="max-md:sr-only">Registrar movimento</span>
          </Button>
        )}
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          <span className="max-md:sr-only">Nova aplicação</span>
        </Button>
      </HeaderActions>

      {loading ? (
        <div aria-busy="true" className="flex flex-col gap-6">
          <span className="sr-only">Carregando carteira</span>
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
        </div>
      ) : failed || !summary.data ? (
        <WorkFeedback error={failed} message={failed ? undefined : 'Não foi possível carregar a carteira.'}
          retry={() => { void investments.refetch(); void summary.refetch(); }} />
      ) : empty ? (
        <Empty className="border border-solid">
          <EmptyHeader>
            <EmptyTitle className="text-base">Nenhuma aplicação na carteira</EmptyTitle>
            <EmptyDescription>
              Cadastre uma aplicação que você já tem com o valor e a data da última avaliação. Depois, registre aportes,
              resgates e rendimentos recebidos.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button onClick={() => setCreating(true)}>Nova aplicação</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <PortfolioSummary summary={summary.data} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-5 pb-3"><h2 className="text-base font-semibold">Minhas aplicações</h2></CardHeader>
              <CardContent className="p-5 pt-0">
                <InvestmentList investments={list} onOpen={item => setDetailId(item.id)} />
                {investments.data && investments.data.totalElements > list.length && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mostrando {list.length} de {investments.data.totalElements} aplicações. Os totais consideram todas.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-5 pb-3"><h2 className="text-base font-semibold">Composição por classe</h2></CardHeader>
              <CardContent className="p-5 pt-0"><ClassComposition summary={summary.data} /></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="p-5 pb-3">
              <h2 className="text-base font-semibold">Movimentos da carteira</h2>
              <p className="text-xs text-muted-foreground">
                Aportes e resgates entram no histórico como transferências. Rendimentos recebidos entram como receita.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {movements.isPending ? <Skeleton className="h-24 w-full" />
                : movements.isError ? <WorkFeedback error={movements.error} retry={() => void movements.refetch()} />
                : movements.data.content.length === 0
                  ? <p className="py-4 text-sm text-muted-foreground">Nenhum aporte, resgate ou rendimento registrado.</p>
                  : <MovementList page={movements.data} names={names} onPageChange={setMovementPage}
                      onEdit={movement => setMoving({ movement })}
                      onDelete={movement => removal.ask({ kind: 'movement', item: movement })} />}
            </CardContent>
          </Card>
        </div>
      )}

      <InvestmentDetail investment={detail} onOpenChange={open => !open && setDetailId(null)}
        onValuate={(investment, valuation) => setValuating({ investment, valuation })}
        onDeleteValuation={valuation => removal.ask({ kind: 'valuation', item: valuation })}
        onMove={(investment, movement) => setMoving({ investmentId: investment.id, movement })}
        onDeleteMovement={movement => removal.ask({ kind: 'movement', item: movement })}
        onEdit={setEditing}
        onDelete={investment => removal.ask({ kind: 'investment', item: investment })} />

      <InvestmentDialog open={creating} onOpenChange={setCreating} />
      <InvestmentDialog open={editing !== null} onOpenChange={open => !open && setEditing(null)} investment={editing} />
      {valuating && (
        <ValuationDialog open onOpenChange={open => !open && setValuating(null)}
          investment={valuating.investment} valuation={valuating.valuation} />
      )}
      <MovementDialog open={moving !== null} onOpenChange={open => !open && setMoving(null)} investments={list}
        investmentId={moving?.investmentId} movement={moving?.movement} />

      <ConfirmDialog open={removal.target !== null} onOpenChange={open => !open && removal.close()}
        title={text.title} objectName={text.name} confirmLabel="Excluir" onConfirm={removal.confirm}
        description={<>Excluir <strong>{text.name}</strong>? {text.detail}</>} />
    </div>
  );
}
