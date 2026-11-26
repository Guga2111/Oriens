import { useId, useState, type ReactNode } from "react";
import { DateRangeFields } from "@/components/common/DateRangeFields";
import { WorkSelect } from "@/components/common/WorkSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useProductToday } from "@/hooks/useProductToday";
import { useTaskLabels } from "@/hooks/useTaskLabels";
import { taskPeriodPresets, type TaskFilters } from "@/lib/task-filters";

export interface TaskFilterProps {
  filters: TaskFilters;
  onChange: (update: Partial<TaskFilters>) => void;
}

export function TaskFilterSearch({ value, onSubmit }: { value: string; onSubmit: (value: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState({ committed: value, text: value });
  if (draft.committed !== value) setDraft({ committed: value, text: value });
  const text = draft.committed === value ? draft.text : value;
  return (
    <form onSubmit={event => { event.preventDefault(); onSubmit(text.trim()); }}>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={id}>Título ou descrição</FieldLabel>
        <div className="flex gap-2">
          <Input id={id} type="search" value={text} onChange={event => setDraft({ committed: value, text: event.target.value })} />
          <Button type="submit" variant="outline">Buscar</Button>
        </div>
      </Field>
    </form>
  );
}

export function TaskFilterOptions<T extends string>({ label, options, labels, icon, selected, onChange }: {
  label: string;
  options: readonly T[];
  labels: Record<T, { label: string }>;
  icon: (option: T) => ReactNode;
  selected: T[];
  onChange: (selected: T[]) => void;
}) {
  return (
    <FieldSet className="gap-1">
      <FieldLegend variant="label" className="sr-only">{label}</FieldLegend>
      <FieldGroup className="gap-0.5">
        {options.map(option => (
          <FieldLabel key={option} className="min-h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 font-normal hover:bg-accent focus-within:bg-accent max-lg:min-h-11">
            <Checkbox checked={selected.includes(option)} onCheckedChange={checked => onChange(
              options.filter(value => value === option ? checked === true : selected.includes(value)),
            )} />
            {icon(option)}
            {labels[option].label}
          </FieldLabel>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}

export function TaskPeriodFields({ filters, onChange }: TaskFilterProps) {
  const id = useId();
  const today = useProductToday();
  const { dateField = "plannedDate", startDate, endDate } = filters;
  const [choice, setChoice] = useState<{ period: string; startDate?: string; endDate?: string }>();
  const presets = taskPeriodPresets(today);
  const hasBounds = !!(startDate || endDate);
  const preset = presets.find(p => p.startDate === startDate && p.endDate === endDate);
  const period = choice && choice.startDate === startDate && choice.endDate === endDate
    ? choice.period : preset?.value ?? (hasBounds ? "custom" : "all");
  function selectPeriod(period: string) {
    const selected = presets.find(p => p.value === period);
    const bounds = period === "custom" ? { startDate, endDate } :
      { startDate: selected?.startDate, endDate: selected?.endDate };
    setChoice({ period, ...bounds });
    if (period !== "custom") onChange({ ...bounds, ...(!selected && { dateField: undefined }) });
  }
  function changeDate(update: Partial<TaskFilters>) {
    setChoice({ period: "custom", startDate, endDate, ...update });
    onChange(update);
  }

  return (
    <FieldGroup className="gap-3">
      <WorkSelect label="Período" value={period} onChange={selectPeriod}
        options={[{ value: "all", label: "Todos os períodos" }, ...presets, { value: "custom", label: "Personalizado" }]} />
      {period !== "all" && <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-date-field`}>Campo de data</FieldLabel>
        <WorkSelect id={`${id}-date-field`} label="Campo de data" value={dateField}
          onChange={value => onChange({ dateField: value === "dueDate" ? "dueDate" : "plannedDate" })}
          options={[{ value: "plannedDate", label: "Planejada para" }, { value: "dueDate", label: "Prazo final" }]} />
      </Field>}
      {period === "custom" && <DateRangeFields start={startDate ?? ""} end={endDate ?? ""}
        onStartChange={value => changeDate({ startDate: value || undefined })}
        onEndChange={value => changeDate({ endDate: value || undefined })} />}
    </FieldGroup>
  );
}

export function TaskLabelFilter({ value, onChange }: { value?: number; onChange: (value?: number) => void }) {
  const labels = useTaskLabels();
  return (
    <Field className="gap-1.5">
      <WorkSelect label="Etiqueta" value={value ? String(value) : "all"}
        onChange={label => onChange(label === "all" ? undefined : Number(label))}
        options={[
          { value: "all", label: "Todas as etiquetas" },
          ...(labels.data ?? []).map(label => ({ value: String(label.id), label: label.name })),
          ...(value && !labels.data?.some(label => label.id === value) ? [{ value: String(value), label: "Etiqueta selecionada" }] : []),
        ]} />
      {labels.isPending && <p role="status" className="text-xs text-muted-foreground">Carregando etiquetas…</p>}
      {labels.isError && <Button type="button" variant="outline" size="sm" onClick={() => void labels.refetch()}>Tentar carregar etiquetas</Button>}
    </Field>
  );
}
