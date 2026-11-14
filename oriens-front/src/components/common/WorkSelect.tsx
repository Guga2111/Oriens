import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function WorkSelect({ id, label, value, onChange, options, disabled }: {
  id?: string; label: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger id={id} aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent><SelectGroup>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select>;
}
