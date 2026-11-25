import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { OriensLogo } from '@/components/common/OriensLogo';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { AppAccountMenu } from './AppAccountMenu';

export function AppTopBar() {
  const { isMobile, openMobile, toggleSidebar } = useSidebar();

  return (
    <header aria-label="Barra superior" className="flex h-top-bar shrink-0 items-center gap-2 px-3">
      {isMobile && (
        <Button variant="ghost" size="icon" className="size-10" aria-label="Alternar menu de navegação" aria-expanded={openMobile} aria-controls="app-navigation-mobile" onClick={toggleSidebar}>
          <Menu aria-hidden />
        </Button>
      )}
      <OriensLogo className="size-6 shrink-0" />
      <span className="text-sm font-semibold">Oriens</span>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <AppAccountMenu />
      </div>
    </header>
  );
}
