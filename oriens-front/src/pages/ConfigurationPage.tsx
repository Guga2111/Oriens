import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { PreferencesCard } from "@/components/settings/PreferencesCard";
import { AccountCard } from "@/components/settings/AccountCard";

export default function ConfigurationPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Configurações"
          description="Gerencie as suas preferências"
        />

        <Separator />

        <div className="grid gap-6">
          <PreferencesCard />
          <AccountCard />
        </div>
      </div>
    </div>
  );
}
