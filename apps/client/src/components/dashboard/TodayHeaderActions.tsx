import { BarChart3, ExternalLink, Link2, MoreHorizontal, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { HeaderActions } from '@/components/common/HeaderActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TodayHeaderActionsProps = {
  search: string;
  onSearchChange: (search: string) => void;
};

export function TodayHeaderActions({ search, onSearchChange }: TodayHeaderActionsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const { pathname, search: query, hash } = useLocation();
  const pagePath = `${pathname}${query}${hash}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(pagePath, window.location.origin).href);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link. Copie o endereço pela barra do navegador.');
    }
  };

  return (
    <HeaderActions>
      <div
        role="search"
        aria-label="Busca de tarefas"
        className={cn('relative shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none', isSearchOpen ? 'w-36 sm:w-56' : 'w-10 md:w-8')}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget) && !search.trim()) setIsSearchOpen(false);
        }}
      >
        {isSearchOpen ? (
          <>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              type="search"
              aria-label="Buscar nas tarefas carregadas"
              placeholder="Buscar tarefas…"
              className="h-7 pl-9 pr-10 focus-visible:ring-1 focus-visible:ring-offset-0"
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onSearchChange('');
                  setIsSearchOpen(false);
                  requestAnimationFrame(() => searchTrigger.current?.focus());
                }
              }}
            />
            {search && <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 md:size-7" aria-label="Limpar busca" onClick={() => onSearchChange('')}><X aria-hidden /></Button>}
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button ref={searchTrigger} variant="ghost" size="icon" aria-label="Buscar tarefas" onClick={() => setIsSearchOpen(true)}>
                <Search aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Buscar tarefas</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Análises"><BarChart3 aria-hidden /><span className={cn(isSearchOpen && 'max-sm:hidden')}>Análises</span></Button>
        </SheetTrigger>
        <SheetContent side="right" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Análises de Hoje</SheetTitle>
        </SheetContent>
      </Sheet>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Mais opções de Hoje"><MoreHorizontal aria-hidden /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to={pagePath} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden />Abrir em nova aba</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copyLink()}><Link2 aria-hidden />Copiar link</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </HeaderActions>
  );
}
