import { ScrollArea } from "@/components/ui/scroll-area";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Ações do rodapé (fora do formulário, para o botão de submit usar `form`). */
  footer?: ReactNode;
  /** Largura máxima do diálogo no desktop. */
  className?: string;
}

/**
 * Diálogo que vira `Drawer` abaixo de 640 px (SPEC R6/P2.0). A altura máxima é
 * de `90dvh` e o corpo rola por dentro, tanto no desktop quanto no mobile.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveDialogProps) {
  const isDrawer = useMediaQuery("(max-width: 639px)");

  if (isDrawer) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} autoFocus>
        <DrawerContent className={cn("max-h-dialog outline-none", className)}>
          <DrawerHeader className="shrink-0 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1"><div className="px-overlay pb-4">{children}</div></ScrollArea>
          {footer && (
            <DrawerFooter className="shrink-0 flex-row justify-end gap-2 border-t">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("flex max-h-dialog flex-col overflow-hidden", className)}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="-mx-1 min-h-0 flex-1"><div className="px-1 py-2 pr-4">{children}</div></ScrollArea>
        {footer && <DialogFooter className="shrink-0">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
