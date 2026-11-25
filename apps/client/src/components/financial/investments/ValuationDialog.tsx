import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useAuth } from '@/context/AuthContext';
import { draftFailureMessage, useDraftSubmit } from '@/hooks/useDraftSubmit';
import { useProductToday } from '@/hooks/useProductToday';
import { investmentAmountError, normalizedAmount } from '@/lib/investments';
import { investmentService } from '@/services/investmentService';
import type { Investment, Valuation, ValuationInput } from '@/types/investment';
import { DayField, MoneyField } from './InvestmentFields';

interface ValuationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment;
  /** Present to correct a recorded valuation instead of adding a new one. */
  valuation?: Valuation | null;
}

export function ValuationDialog(props: ValuationDialogProps) {
  if (!props.open) return null;
  return <ValuationForm key={props.valuation?.id ?? 'new'} {...props} />;
}

function ValuationForm({ open, onOpenChange, investment, valuation }: ValuationDialogProps) {
  const { userId } = useAuth();
  const today = useProductToday();
  const [amount, setAmount] = useState(valuation?.amount ?? '');
  const [valuedOn, setValuedOn] = useState(valuation?.valuedOn ?? today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = 'Salvar avaliação';

  const write = useDraftSubmit((input: ValuationInput, key: string) => valuation
    ? investmentService.replaceValuation(userId!, valuation, input, key)
    : investmentService.addValuation(userId!, investment.id, input, key));

  const dirty = valuation ? amount !== valuation.amount || valuedOn !== valuation.valuedOn : Boolean(amount);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const amountError = investmentAmountError(amount, true);
    if (amountError) next.amount = amountError;
    if (!valuedOn) next.valuedOn = 'Escolha a data da avaliação.';
    setErrors(next);
    if (Object.keys(next).length) return;

    if (!await write.submit({ amount: Number(normalizedAmount(amount)), valuedOn })) return;
    toast.success(valuation ? 'Avaliação corrigida' : 'Avaliação registrada', {
      description: 'A posição passa a partir da avaliação mais recente.',
    });
    onOpenChange(false);
  };

  return (
    <DraftDialog open={open} onOpenChange={onOpenChange} dirty={dirty} busy={write.pending} uncertain={write.uncertain}
      title={valuation ? 'Corrigir avaliação' : 'Atualizar avaliação'}
      description={`${investment.name}. Informe quanto a aplicação valia na data, conforme o extrato.`}
      className="sm:max-w-[440px]"
      footer={<Button type="submit" form="valuation-form" disabled={write.pending}>
        {write.pending && <Loader2 aria-hidden className="animate-spin" />}{action}
      </Button>}>
      <form id="valuation-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {write.failure ? <WorkFeedback error={write.failure} message={draftFailureMessage(write.failure, write.uncertain, action)} /> : null}
        <fieldset disabled={write.pending || write.uncertain} className="min-w-0">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <MoneyField id="valuation-amount" label="Valor informado" value={amount} onChange={setAmount} error={errors.amount} />
            <DayField id="valuation-date" label="Data da avaliação" value={valuedOn} onChange={setValuedOn} today={today} error={errors.valuedOn} />
          </FieldGroup>
        </fieldset>
      </form>
    </DraftDialog>
  );
}
