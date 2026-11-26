import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { WORK_VIEWS, type WorkView } from '@/lib/project-tabs';

/** Stands in for a work-item view that is planned but not built yet, and offers the views that exist. */
export function ComingSoonView({ view, onPick }: { view: WorkView; onPick: (view: WorkView) => void }) {
  const current = WORK_VIEWS.find(item => item.value === view)!;
  return (
    <Empty className="border border-dashed" aria-label={`Visão ${current.label}`} role="region">
      <EmptyHeader>
        <EmptyMedia variant="icon"><current.icon aria-hidden /></EmptyMedia>
        <EmptyTitle>{current.label} em breve</EmptyTitle>
        <EmptyDescription>Esta visão dos itens de trabalho ainda está sendo construída. Por enquanto, use o quadro ou a timeline.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        {WORK_VIEWS.filter(item => item.ready).map(item => (
          <Button key={item.value} type="button" variant="outline" size="sm" onClick={() => onPick(item.value)}><item.icon aria-hidden />Abrir {item.label.toLowerCase()}</Button>
        ))}
      </EmptyContent>
    </Empty>
  );
}
