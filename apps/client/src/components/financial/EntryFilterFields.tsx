import { useId } from "react";
import { DateRangeFields } from "@/components/common/DateRangeFields";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EntriesFilters, EntriesPeriod } from "@/lib/financial-route";
import type { TagDTO } from "@/types/financial";

const PERIODS: { value: EntriesPeriod; label: string }[] = [
  { value: "all", label: "Todos os períodos" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "15days", label: "Últimos 15 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "custom", label: "Personalizado" },
];

const ALL_TAGS = "all";

/** Period and category fields of the entries filter panel; the search lives in the header. */
export function EntryFilterFields({ filters, tags, onChange }: {
  filters: EntriesFilters;
  tags: TagDTO[];
  onChange: (update: Partial<EntriesFilters>) => void;
}) {
  const id = useId();
  return (
    <FieldGroup className="gap-3">
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-period`}>Período</FieldLabel>
        <Select value={filters.period} onValueChange={(period: EntriesPeriod) => onChange({ period })}>
          <SelectTrigger id={`${id}-period`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PERIODS.map(period => <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {filters.period === "custom" && <DateRangeFields start={filters.start} end={filters.end}
        onStartChange={start => onChange({ start })} onEndChange={end => onChange({ end })} />}
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-tag`}>Categoria</FieldLabel>
        <Select value={filters.tagId === null ? ALL_TAGS : String(filters.tagId)}
          onValueChange={value => onChange({ tagId: value === ALL_TAGS ? null : Number(value) })}>
          <SelectTrigger id={`${id}-tag`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_TAGS}>Todas as categorias</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={String(tag.id)}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}
