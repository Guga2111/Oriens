import { useState, type ComponentProps } from 'react';
import { ResponsiveDialog } from './ResponsiveDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function DraftDialog({ dirty, busy, uncertain = false, onOpenChange, ...props }: ComponentProps<typeof ResponsiveDialog> & { dirty: boolean; busy: boolean; uncertain?: boolean }) {
  const [discard, setDiscard] = useState(false);
  const changeOpen = (open: boolean) => {
    if (busy) return;
    if (!open && dirty) setDiscard(true); else onOpenChange(open);
  };
  return <><ResponsiveDialog {...props} className={cn(props.className, "max-sm:[&_button:not([role=radio]):not([role=checkbox])]:min-h-11 max-sm:[&_input]:min-h-11")} onOpenChange={changeOpen}
    footer={<><Button type="button" variant="ghost" disabled={busy} onClick={() => changeOpen(false)}>Cancelar</Button>{props.footer}</>} />
    <ConfirmDialog open={discard} onOpenChange={setDiscard} title="Descartar alterações?" objectName="rascunho"
      description={uncertain ? "O envio ainda não foi confirmado e pode ter sido salvo. Se descartar este rascunho, confira a lista antes de iniciar outro pedido." : "As alterações ainda não foram salvas. Deseja descartar este rascunho?"} confirmLabel="Descartar"
      onConfirm={() => onOpenChange(false)} />
  </>;
}
