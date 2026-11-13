import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { SettingsSection, SettingRow } from "./SettingsSection";

/**
 * Integrações (SPEC §11.8): o WhatsApp aparece **apenas com o estado**.
 * A conexão depende do endpoint BE1, que ainda não existe — por isso não há
 * botão de conectar e o componente `WhatsAppConnect` não é criado.
 */
export function IntegrationsSection() {
  const { phoneNumber } = useAuth();

  return (
    <SettingsSection
      title="Integrações"
      description="Serviços conectados ao Oriens."
    >
      <SettingRow
        label="WhatsApp"
        description="Lembretes 15 minutos antes de cada tarefa."
      >
        {phoneNumber ? (
          <Badge variant="positive" className="font-normal">
            Conectado: {phoneNumber}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Não conectado</span>
        )}
      </SettingRow>
    </SettingsSection>
  );
}
