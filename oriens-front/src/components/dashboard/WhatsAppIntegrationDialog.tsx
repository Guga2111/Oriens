import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";

interface WhatsAppIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhoneNumber?: string | null;
  onSuccess?: () => void;
}

type Step = "input" | "verification" | "success";

export function WhatsAppIntegrationDialog({
  open,
  onOpenChange,
  currentPhoneNumber,
  onSuccess,
}: WhatsAppIntegrationDialogProps) {
  const { userId } = useAuth();
  const [step, setStep] = useState<Step>("input");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStep("input");
    setPhoneNumber("");
    setVerificationCode("");
    setError(null);
    onOpenChange(false);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, "");

    // Se começar com 55 (Brasil) e tiver mais de 2 dígitos
    if (numbers.startsWith("55") && numbers.length > 2) {
      return `+${numbers}`;
    }

    // Se não começar com +, adiciona
    if (numbers.length > 0 && !value.startsWith("+")) {
      return `+${numbers}`;
    }

    return value;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Formato esperado: +5511999999999 (mínimo 10 dígitos após o +)
    const regex = /^\+\d{10,15}$/;
    return regex.test(phone);
  };

  const handleSendCode = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError("Formato inválido. Use: +5511999999999");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/api/whatsapp/send-verification", {
        userId,
        phoneNumber,
      });

      if (response.data.success) {
        setStep("verification");
        toast({
          title: "Código Enviado!",
          description: `Um código de verificação foi enviado para ${phoneNumber}`,
        });
      } else {
        setError(response.data.message || "Falha ao enviar código");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Erro ao enviar código. Tente novamente.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError("O código deve ter 6 dígitos");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/api/whatsapp/verify-code", {
        userId,
        phoneNumber,
        code: verificationCode,
      });

      if (response.data.success) {
        setStep("success");
        toast({
          title: "Verificado!",
          description: "Seu número foi verificado com sucesso",
        });

        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 2000);
      } else {
        setError(response.data.message || "Código inválido");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Código inválido ou expirado";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationCode("");
    await handleSendCode();
  };

  const handleRemovePhone = async () => {
    if (!confirm("Tem certeza que deseja remover seu número de telefone? Você não receberá mais notificações por WhatsApp.")) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.delete(`/api/whatsapp/phone/${userId}`);

      if (response.data.success) {
        toast({
          title: "Removido",
          description: "Número de telefone removido com sucesso",
        });
        handleClose();
        onSuccess?.();
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao remover número de telefone",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Integração com WhatsApp
              </DialogTitle>
              <DialogDescription>
                {currentPhoneNumber
                  ? "Você já possui um número cadastrado. Deseja alterar?"
                  : "Receba lembretes de tarefas 15 minutos antes no WhatsApp"}
              </DialogDescription>
            </DialogHeader>

            {currentPhoneNumber && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="text-muted-foreground">Número atual:</p>
                <p className="font-medium">{currentPhoneNumber}</p>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  placeholder="+5511999999999"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Formato: +[código do país][DDD][número]
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              {currentPhoneNumber && (
                <Button
                  variant="destructive"
                  onClick={handleRemovePhone}
                  disabled={isLoading}
                >
                  Remover Número
                </Button>
              )}
              <Button onClick={handleSendCode} disabled={isLoading || !phoneNumber}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Código
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "verification" && (
          <>
            <DialogHeader>
              <DialogTitle>Verificar Código</DialogTitle>
              <DialogDescription>
                Digite o código de 6 dígitos enviado para {phoneNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                    setError(null);
                  }}
                  maxLength={6}
                  disabled={isLoading}
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  O código expira em 10 minutos
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleResendCode}
                disabled={isLoading}
              >
                Reenviar Código
              </Button>
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Verificado com Sucesso!
              </DialogTitle>
              <DialogDescription>
                Você receberá lembretes de tarefas no WhatsApp
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <p className="text-center text-sm text-muted-foreground">
                Número {phoneNumber} verificado!
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
