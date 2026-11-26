import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { WorkDatePicker } from '@/components/common/WorkDatePicker';

/** Money typed in reais, with the error tied to the control for screen readers. */
export function MoneyField({ id, label, value, onChange, error, hint }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
        <Input id={id} inputMode="decimal" autoComplete="off" placeholder="0,00" value={value} className="pl-10 tabular-nums"
          onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      </div>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : hint ? <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription> : null}
    </Field>
  );
}

/** Product calendar day, never after today: valuations and movements record what already happened. */
export function DayField({ id, label, value, onChange, today, error }: {
  id: string; label: string; value: string; onChange: (value: string) => void; today: string; error?: string;
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <WorkDatePicker id={id} label={label} value={value} onChange={onChange} max={today} required invalid={Boolean(error)} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
