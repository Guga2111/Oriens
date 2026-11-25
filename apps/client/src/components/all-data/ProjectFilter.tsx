import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useWorkProjects } from "@/hooks/useWork";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";

export function ProjectFilter({ value, onChange }: { value?: number; onChange: (id?: number) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const projects = useWorkProjects({ size: 100, includeArchived: true, search: search || undefined });
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" aria-expanded={open} aria-label="Projeto" className="w-full justify-between sm:w-[200px]">
        <span className="truncate">{value ? selectedTitle || projects.data?.content.find(p => p.id === value)?.title || "Projeto selecionado" : "Todos os projetos"}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" aria-hidden />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[280px] p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar projeto" value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandItem onSelect={() => { onChange(undefined); setOpen(false); }}>Todos os projetos</CommandItem>
          {projects.isPending && <p className="p-3 text-sm">Carregando projetos…</p>}
          {projects.isError && <Button variant="ghost" onClick={() => void projects.refetch()}>Tentar novamente</Button>}
          {!projects.isPending && !projects.isError && <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>}
          {projects.data?.content.map(p => <CommandItem key={p.id} value={String(p.id)}
            onSelect={() => { onChange(p.id); setSelectedTitle(p.title); setOpen(false); }}>
            <Check className={value === p.id ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 invisible"} aria-hidden />
            {p.title}{p.archived ? " · Arquivado" : ""}
          </CommandItem>)}
          {(projects.data?.totalElements ?? 0) > 100 && <p className="p-3 text-sm">Refine a busca para encontrar outros projetos.</p>}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
