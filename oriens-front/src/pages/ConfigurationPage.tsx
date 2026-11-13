import { PageHeader } from "@/components/common/PageHeader";
import { AccountSection } from "@/components/settings/AccountSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";

/**
 * Configurações (SPEC §11.8): canvas de 720 px alinhado à esquerda, com as
 * seções Aparência, Notificações e som, Integrações e Conta.
 */
export default function ConfigurationPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex max-w-[720px] flex-col gap-8">
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
