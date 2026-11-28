import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CircleCheck, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueryContent, AnalysisEmpty } from '@/components/statistics/AnalysisPrimitives';
import { ProjectCoverThumbnail } from '@/components/projects/ProjectCoverThumbnail';
import { useHomeRecents } from '@/hooks/useHome';

export function RecentItems({ onOpenTask }: { onOpenTask: (id: number) => void }) {
  const query = useHomeRecents();
  return <section aria-labelledby="home-recents-title" className="flex flex-col gap-4">
    <h2 id="home-recents-title" className="text-sm font-medium">Recentes</h2>
    <QueryContent query={query} label="acessos recentes">{items => items.length === 0
      ? <AnalysisEmpty title="Retome de onde parou" description="Os projetos e tarefas que você abrir aparecerão aqui." />
      : <ul className="flex flex-col gap-1">{items.map(item => {
        const content = <><span className="shrink-0 text-muted-foreground">{item.type === 'PROJECT'
          ? <ProjectCoverThumbnail imageUrl={item.imageUrl} fallback={<Folder className="size-4" aria-hidden />} />
          : <CircleCheck className="size-4" aria-hidden />}</span>
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{item.type === 'PROJECT' ? 'Projeto' : 'Tarefa'}</span>
          <time dateTime={item.visitedAt} className="shrink-0 text-xs font-normal text-muted-foreground">{formatDistanceToNow(new Date(item.visitedAt), { addSuffix: true, locale: ptBR })}</time></>;
        return <li key={`${item.type}:${item.resourceId}`}>
          {item.type === 'PROJECT' ? <Button asChild variant="ghost" className="h-auto min-h-11 w-full justify-start gap-3 px-2 py-2 text-left font-normal"><Link to={`/tasks/project/${item.resourceId}`}>{content}</Link></Button>
            : <Button variant="ghost" className="h-auto min-h-11 w-full justify-start gap-3 px-2 py-2 text-left font-normal" onClick={() => onOpenTask(item.resourceId)}>{content}</Button>}
        </li>;
      })}</ul>}
    </QueryContent>
  </section>;
}
