import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import settingsService from "@/services/settingsService";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SettingsSection, SettingRow } from "./SettingsSection";

/**
 * Conta (SPEC §11.8): dados da conta e a exclusão, sempre com confirmação.
 */
export function AccountSection() {
  const { userEmail, username, userId, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!userId) {
      toast.error("Usuário não identificado");
      return;
    }

    try {
      setIsDeleting(true);
      await settingsService.deleteAccount(userId);
      toast.success("Conta excluída com sucesso");
      logout();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir a conta. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SettingsSection title="Conta" description="Seus dados no Oriens.">
      <SettingRow label="E-mail" description="Usado para entrar no Oriens.">
        <span className="text-sm text-muted-foreground">{userEmail}</span>
      </SettingRow>

      <SettingRow
        label="Nome de usuário"
        description="Como você aparece no app."
      >
        <span className="text-sm text-muted-foreground">{username}</span>
      </SettingRow>

      <SettingRow
        label="Excluir conta"
        description="Remove a conta e todos os seus dados. Não pode ser desfeito."
      >
        <Button
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          onClick={() => setIsDeleteOpen(true)}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Excluindo
            </>
          ) : (
            "Excluir conta"
          )}
        </Button>
      </SettingRow>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir conta?"
        objectName="sua conta"
        confirmLabel="Excluir conta"
        onConfirm={handleDeleteAccount}
        description={
          <>
            Excluir <strong>sua conta</strong>? Esta ação não pode ser desfeita.
          </>
        }
      />
    </SettingsSection>
  );
}
