import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { WorkSelect } from '@/components/common/WorkSelect';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { draftFailureMessage, useDraftSubmit } from '@/hooks/useDraftSubmit';
import { useProductToday } from '@/hooks/useProductToday';
import { investmentAmountError, isMovementType, movementHistoryNote, MOVEMENT_TYPE, MOVEMENT_TYPE_ORDER, normalizedAmount } from '@/lib/investments';
import { investmentService } from '@/services/investmentService';
import type { Investment, Movement, MovementInput, MovementType } from '@/types/investment';
import { DayField, MoneyField } from './InvestmentFields';

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Investments the movement may belong to; a correction keeps its investment. */
  investments: Investment[];
  /** Preselected investment when the dialog opens from its detail. */
  investmentId?: number | null;
  movement?: Movement | null;
}

export function MovementDialog(props: MovementDialogProps) {
  if (!props.open) return null;
  return <MovementForm key={props.movement?.id ?? `new-${props.investmentId ?? ''}`} {...props} />;
}

type MovementWrite = { investmentId: number; input: MovementInput };

// eslint-disable-next-line complexity -- existing score 26; owner: client maintainers.
function MovementForm({ open, onOpenChange, investments, investmentId, movement }: MovementDialogProps) {
  const { userId } = useAuth();
  const today = useProductToday();
  const [target, setTarget] = useState(String(movement?.investmentId ?? investmentId ?? investments[0]?.id ?? ''));
  const [type, setType] = useState<MovementType>(movement?.type ?? 'CONTRIBUTION');
  const [amount, setAmount] = useState(movement?.amount ?? '');
  const [occurredOn, setOccurredOn] = useState(movement?.occurredOn ?? today);
  const [description, setDescription] = useState(movement?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = 'Salvar movimento';

  const write = useDraftSubmit((body: MovementWrite, key: string) => movement
    ? investmentService.replaceMovement(userId!, movement, body.input, key)
    : investmentService.addMovement(userId!, body.investmentId, body.input, key));

  const dirty = movement
    ? type !== movement.type || amount !== movement.amount || occurredOn !== movement.occurredOn || description !== (movement.description ?? '')
    : Boolean(amount || description);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!target) next.investment = 'Escolha a aplicação.';
    const amountError = investmentAmountError(amount, false);
    if (amountError) next.amount = amountError;
    if (!occurredOn) next.occurredOn = 'Escolha a data do movimento.';
    if (description.length > 255) next.description = 'Use até 255 caracteres.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const saved = await write.submit({
      investmentId: Number(target),
      input: { type, amount: Number(normalizedAmount(amount)), occurredOn, description: description.trim() || null },
    });
    if (!saved) return;
    toast.success(movement ? 'Movimento corrigido' : MOVEMENT_TYPE[type].saved, { description: movementHistoryNote(type) });
    onOpenChange(false);
  };

  const options = investments.map(item => ({ value: String(item.id), label: item.name }));

  return (
    <DraftDialog open={open} onOpenChange={onOpenChange} dirty={dirty} busy={write.pending} uncertain={write.uncertain}
      title={movement ? 'Corrigir movimento' : 'Registrar movimento'}
      description="A tag Investimentos é aplicada automaticamente ao lançamento do histórico."
      className="sm:max-w-[480px]"
      footer={<Button type="submit" form="movement-form" disabled={write.pending}>
        {write.pending && <Loader2 aria-hidden className="animate-spin" />}{action}
      </Button>}>
      <form id="movement-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {write.failure ? <WorkFeedback error={write.failure} message={draftFailureMessage(write.failure, write.uncertain, action)} /> : null}
        <fieldset disabled={write.pending || write.uncertain} className="min-w-0">
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.investment)}>
              <FieldLabel htmlFor="movement-investment">Aplicação</FieldLabel>
              <WorkSelect id="movement-investment" label="Aplicação" value={target} options={options} onChange={setTarget}
                disabled={Boolean(movement)} />
              {errors.investment && <FieldError>{errors.investment}</FieldError>}
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Tipo</FieldLegend>
              <RadioGroup value={type} onValueChange={value => isMovementType(value) && setType(value)} className="gap-2">
                {MOVEMENT_TYPE_ORDER.map(value => (
                  <div key={value} className="flex items-start gap-2">
                    <RadioGroupItem id={`movement-type-${value}`} value={value} aria-describedby={`movement-type-${value}-hint`} className="mt-0.5" />
                    <div className="flex flex-col">
                      <Label htmlFor={`movement-type-${value}`} className="font-normal">{MOVEMENT_TYPE[value].label}</Label>
                      <span id={`movement-type-${value}-hint`} className="text-xs text-muted-foreground">{MOVEMENT_TYPE[value].cash}</span>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField id="movement-amount" label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
              <DayField id="movement-date" label="Data" value={occurredOn} onChange={setOccurredOn} today={today} error={errors.occurredOn} />
            </div>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="movement-description">Descrição (opcional)</FieldLabel>
              <Input id="movement-description" value={description} maxLength={255} autoComplete="off"
                onChange={event => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)}
                aria-describedby="movement-description-hint" />
              {errors.description ? <FieldError>{errors.description}</FieldError>
                : <FieldDescription id="movement-description-hint">Sem descrição, o histórico mostra o tipo e o nome da aplicação.</FieldDescription>}
            </Field>
          </FieldGroup>
        </fieldset>
      </form>
    </DraftDialog>
  );
}
