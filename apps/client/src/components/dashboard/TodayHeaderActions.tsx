import { BarChart3, ExternalLink, Link2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { HeaderActions } from '@/components/common/HeaderActions';
import { Button } from '@/components/ui/button';
import { HeaderSearch } from '@/components/common/HeaderSearch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type TodayHeaderActionsProps = {
  search: string;
  onSearchChange: (search: string) => void;
};

export function TodayHeaderActions({ search, onSearchChange }: TodayHeaderActionsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
      <HeaderSearch label="Buscar tarefas" inputLabel="Buscar nas tarefas carregadas" placeholder="Buscar tarefas…"
        value={search} onChange={onSearchChange} open={isSearchOpen} onOpenChange={setIsSearchOpen} />
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
