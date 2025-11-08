import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import settingsService from "@/services/settingsService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountCard() {
  const { userEmail, username, userId, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!userId) {
      toast.error("Usuário não identificado");
      return;
    }

    try {
      setIsDeleting(true);
      await settingsService.deleteAccount(userId);
      toast.success("Conta deletada com sucesso");
      logout();
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      toast.error("Erro ao deletar a conta. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações da Conta</CardTitle>
        <CardDescription>
          Visualize e gerencie as informações da sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
        <div>
          <Label>Nome de Usuário</Label>
          <p className="text-sm text-muted-foreground">{username}</p>
        </div>
        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando
                  </>
                ) : (
                  "Deletar Conta"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso irá deletar permanentemente
                  sua conta e remover seus dados de nossos servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Deletar Conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
