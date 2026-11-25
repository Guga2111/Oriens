import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { WorkSelect } from '@/components/common/WorkSelect';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { draftFailureMessage, useDraftSubmit } from '@/hooks/useDraftSubmit';
import { useProductToday } from '@/hooks/useProductToday';
import { ASSET_CLASS, ASSET_CLASS_ORDER, investmentAmountError, isAssetClass, investmentNameError, normalizedAmount } from '@/lib/investments';
import { investmentService } from '@/services/investmentService';
import type { AssetClass, Investment, InvestmentCreate, InvestmentPatch } from '@/types/investment';
import { DayField, MoneyField } from './InvestmentFields';

type InvestmentWrite = { mode: 'create'; input: InvestmentCreate } | { mode: 'patch'; input: InvestmentPatch };

const CLASS_OPTIONS = ASSET_CLASS_ORDER.map(value => ({ value, label: ASSET_CLASS[value] }));

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent to register an investment; present to rename it or change its class. */
  investment?: Investment | null;
}

/** Mounted per opening, so every draft starts from the investment it edits. */
export function InvestmentDialog(props: InvestmentDialogProps) {
  if (!props.open) return null;
  return <InvestmentForm key={props.investment?.id ?? 'new'} {...props} />;
}

function InvestmentForm({ open, onOpenChange, investment }: InvestmentDialogProps) {
  const { userId } = useAuth();
  const today = useProductToday();
  const editing = Boolean(investment);
  const [name, setName] = useState(investment?.name ?? '');
  const [assetClass, setAssetClass] = useState<AssetClass>(investment?.assetClass ?? 'FIXED_INCOME');
  const [amount, setAmount] = useState('');
  const [valuedOn, setValuedOn] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = editing ? 'Salvar alterações' : 'Salvar aplicação';

  const write = useDraftSubmit((body: InvestmentWrite, key: string) => {
    if (body.mode === 'create') return investmentService.create(userId!, body.input, key);
    if (!investment) throw new Error('Recarregue a aplicação antes de salvar.');
    return investmentService.patch(userId!, investment.id, investment.version, body.input, key);
  });

  const dirty = investment
    ? name !== investment.name || assetClass !== investment.assetClass
    : Boolean(name || amount);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const nameError = investmentNameError(name);
    if (nameError) next.name = nameError;
    if (!editing) {
      const amountError = investmentAmountError(amount, true);
      if (amountError) next.amount = amountError;
      if (!valuedOn) next.valuedOn = 'Escolha a data da avaliação.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const saved = await write.submit(editing
      ? { mode: 'patch', input: { name: name.trim(), assetClass } }
      : { mode: 'create', input: { name: name.trim(), assetClass, initialValue: Number(normalizedAmount(amount)), valuedOn } });
    if (!saved) return;
    toast.success(editing ? 'Aplicação atualizada' : 'Aplicação cadastrada', {
      description: editing ? undefined : 'O valor informado entrou na carteira sem movimentar o saldo disponível.',
    });
    onOpenChange(false);
  };

  return (
    <DraftDialog open={open} onOpenChange={onOpenChange} dirty={dirty} busy={write.pending} uncertain={write.uncertain}
      title={editing ? 'Editar aplicação' : 'Nova aplicação'}
      description={editing ? 'Altere o nome ou a classe. Valores mudam por avaliações e movimentos.'
        : 'Comece por uma aplicação que você já tem, com o valor e a data da avaliação.'}
      className="sm:max-w-[480px]"
      footer={<Button type="submit" form="investment-form" disabled={write.pending}>
        {write.pending && <Loader2 aria-hidden className="animate-spin" />}{action}
      </Button>}>
      <form id="investment-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {write.failure ? <WorkFeedback error={write.failure} message={draftFailureMessage(write.failure, write.uncertain, action)} /> : null}
        <fieldset disabled={write.pending || write.uncertain} className="min-w-0">
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="investment-name">Nome da aplicação</FieldLabel>
              <Input id="investment-name" value={name} maxLength={120} placeholder="Ex.: CDB Banco X 2028" autoComplete="off"
                onChange={event => setName(event.target.value)} aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'investment-name-error' : undefined} />
              {errors.name && <FieldError id="investment-name-error">{errors.name}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="investment-class">Classe</FieldLabel>
              <WorkSelect id="investment-class" label="Classe" value={assetClass} options={CLASS_OPTIONS}
                onChange={value => isAssetClass(value) && setAssetClass(value)} />
            </Field>
            {!editing && (
              <div className="grid gap-4 sm:grid-cols-2">
                <MoneyField id="investment-amount" label="Valor atual" value={amount} onChange={setAmount} error={errors.amount}
                  hint="R$ 0,00 também é válido." />
                <DayField id="investment-valued-on" label="Data da avaliação" value={valuedOn} onChange={setValuedOn} today={today}
                  error={errors.valuedOn} />
              </div>
            )}
            {!editing && (
              <FieldDescription>
                Para investir dinheiro do caixa depois do cadastro, registre um aporte.
              </FieldDescription>
            )}
          </FieldGroup>
        </fieldset>
      </form>
    </DraftDialog>
  );
}
