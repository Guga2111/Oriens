import { PageHeader } from "@/components/common/PageHeader";
import { AccountSection } from "@/components/settings/AccountSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";

/**
 * Configurações (SPEC §11.8): canvas compartilhado com as demais páginas, com as
 * seções Aparência, Notificações e som, Integrações e Conta.
 */
export default function ConfigurationPage() {
  return (
    <div className="min-w-0 w-full">
      <div className="flex min-w-0 w-full flex-col gap-8">
        <PageHeader
          title="Configurações"
          description="Gerencie suas preferências"
        />

        <AppearanceSection />
        <NotificationsSection />
        <IntegrationsSection />
        <AccountSection />
      </div>
    </div>
  );
}
