import { useId } from "react";
import { WorkDatePicker } from "@/components/common/WorkDatePicker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export function DateRangeFields({ start, end, onStartChange, onEndChange }: {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  const id = useId();
  const inverted = !!(start && end && start > end);
  return (
    <>
      <Field className="gap-1.5" data-invalid={inverted}>
        <FieldLabel htmlFor={`${id}-start`}>Data inicial</FieldLabel>
        <WorkDatePicker id={`${id}-start`} label="Data inicial" value={start} max={end || undefined}
          invalid={inverted} onChange={onStartChange} />
      </Field>
      <Field className="gap-1.5" data-invalid={inverted}>
        <FieldLabel htmlFor={`${id}-end`}>Data final</FieldLabel>
        <WorkDatePicker id={`${id}-end`} label="Data final" value={end} min={start || undefined}
          invalid={inverted} onChange={onEndChange} />
        {inverted && <FieldError>A data final não pode anteceder a inicial.</FieldError>}
      </Field>
    </>
  );
}
