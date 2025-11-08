import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/common/AppHeader";
import { PreferencesCard } from "@/components/settings/PreferencesCard";
import { AccountCard } from "@/components/settings/AccountCard";

export default function ConfigurationPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <AppHeader />
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground">
                  Gerencie as suas preferências
                </p>
              </div>

              <Separator />

              <div className="grid gap-6">
                <PreferencesCard />
                <AccountCard />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}