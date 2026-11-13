import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

/**
 * Barra superior do shell único (SPEC §10.3): 48 px, gatilho da sidebar à
 * esquerda e notificações à direita. Sem `h1` — o título da rota é do
 * `PageHeader`. Tema e "Sair" vivem no menu do usuário do rodapé da sidebar.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="h-10 w-10" aria-label="Alternar menu de navegação" />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex-1" />
      <NotificationBell />
    </header>
  );
}
