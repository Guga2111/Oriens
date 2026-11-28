import { useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function WorkCombobox({ id, label, value, options, onChange, search, onSearchChange, loading }: {
  id?: string; label: string; value: string; options: { value: string; label: string; leading?: ReactNode }[];
  onChange: (value: string) => void; search: string; onSearchChange: (value: string) => void; loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={label} className="w-full min-w-0 justify-between font-normal">
      <span className="flex min-w-0 items-center gap-2">
        {selected?.leading}<span className="truncate">{selected?.label ?? 'Selecionar projeto'}</span>
      </span><ChevronsUpDown aria-hidden />
    </Button></PopoverTrigger>
    <PopoverContent className="w-popover-trigger p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar projeto…" aria-label="Buscar projeto de desenvolvimento" value={search} onValueChange={onSearchChange} />
        <CommandList aria-busy={loading}>
          <CommandEmpty>{loading ? 'Buscando projetos…' : 'Nenhum projeto encontrado.'}</CommandEmpty>
          <CommandGroup>{options.map(option => <CommandItem key={option.value} value={option.value} onSelect={() => { onChange(option.value); setOpen(false); }}>
            {option.leading}
            <span className="min-w-0 flex-1 break-words">{option.label}</span>{value === option.value && <Check aria-hidden />}
          </CommandItem>)}</CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
