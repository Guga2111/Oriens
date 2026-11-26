import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useWorkProjects } from "@/hooks/useWork";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

export function ProjectFilter({ value, onChange }: { value?: number; onChange: (id?: number) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: number; title: string }>();
  const projects = useWorkProjects({ size: 100, includeArchived: true, search: search || undefined });
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" aria-label="Projeto" aria-expanded={open} className="w-full justify-between">
        <span className="truncate">{value ? projects.data?.content.find(p => p.id === value)?.title || (selected?.id === value ? selected.title : undefined) || "Projeto selecionado" : "Todos os projetos"}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" aria-hidden />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-64 p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar projeto" value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandGroup>
            <CommandItem onSelect={() => { onChange(undefined); setOpen(false); }}>Todos os projetos</CommandItem>
          </CommandGroup>
          {projects.isPending && <p className="p-3 text-sm">Carregando projetos…</p>}
          {projects.isError && <Button variant="ghost" onClick={() => void projects.refetch()}>Tentar novamente</Button>}
          {projects.isSuccess && projects.data.content.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum projeto encontrado.</p>}
          <CommandGroup>{projects.data?.content.map(p => <CommandItem key={p.id} value={String(p.id)}
            onSelect={() => { onChange(p.id); setSelected(p); setOpen(false); }}>
            <Check className={value === p.id ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 invisible"} aria-hidden />
            {p.title}{p.archived ? " · Arquivado" : ""}
          </CommandItem>)}</CommandGroup>
          {(projects.data?.totalElements ?? 0) > 100 && <p className="p-3 text-sm">Refine a busca para encontrar outros projetos.</p>}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
