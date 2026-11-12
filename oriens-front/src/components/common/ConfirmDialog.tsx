import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pergunta de confirmação (ex.: "Excluir tarefa?"). */
  title: string;
  /** Nome do item afetado, exibido em `<strong>` na descrição. */
  objectName: string;
  /** Rótulo da ação destrutiva (ex.: "Excluir"). */
  confirmLabel: string;
  /** Executa a ação; pode ser assíncrono — o botão fica em carregamento. */
  onConfirm: () => void | Promise<void>;
  description?: ReactNode;
}

/**
 * Confirmação de ação destrutiva (SPEC §10.3, A8): nenhuma exclusão acontece
 * sem este diálogo, e o botão de confirmação mostra estado de carregamento
 * enquanto a requisição não termina.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  objectName,
  confirmLabel,
  onConfirm,
  description,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Não fecha enquanto a ação está em andamento.
        if (!isConfirming) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? (
              <>
                Esta ação não pode ser desfeita. Confirmar a exclusão de{" "}
                <strong>{objectName}</strong>?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isConfirming}
            onClick={(event) => {
              // Mantém o diálogo aberto até onConfirm terminar.
              event.preventDefault();
              void handleConfirm();
            }}
          >
            {isConfirming && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
