import type { ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useProjectBoard } from '@/hooks/useWork';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { ProjectDescriptionSection } from './ProjectDescriptionSection';
import { ProjectPropertiesCard } from './ProjectPropertiesCard';
import { ProjectProgressSummary } from './ProjectProgressSummary';
import type { WorkProject } from '@/types/work';

interface ProjectOverviewProps {
  project: WorkProject;
  board: ReturnType<typeof useProjectBoard>;
  notices: ReactNode;
  coverPending: boolean;
  onChooseCover: () => void;
  onReload: () => void;
}

export function ProjectOverview({ project, board, notices, coverPending, onChooseCover, onReload }: ProjectOverviewProps) {
  const coverAction = <Button type="button" variant="outline" size="sm" disabled={coverPending} onClick={onChooseCover}>
    <ImagePlus aria-hidden />
    {coverPending ? 'Salvando capa…' : project.imageUrl ? 'Trocar capa' : 'Adicionar capa'}
  </Button>;

  return (
    <div className="grid min-w-0 items-start gap-6 desktop:grid-cols-project-detail desktop:grid-rows-[auto_1fr] desktop:gap-x-8">
      <article className="flex min-w-0 flex-col gap-6 desktop:col-start-1 desktop:row-start-1">
        <header className="flex min-w-0 flex-col gap-6">
          {project.imageUrl && (
            <div className="relative aspect-project-cover max-h-48 overflow-hidden rounded-lg">
              <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="absolute inset-0 size-full object-cover" />
              <div className="absolute bottom-3 right-3">{coverAction}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight md:text-2xl">{project.title}</h1>
            {!project.imageUrl && coverAction}
          </div>
        </header>
        {notices}
        <ProjectDescriptionSection project={project} onReload={onReload} />
      </article>
      <div className="flex min-w-0 flex-col gap-4 desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:flex-col-reverse">
        <ProjectProgressSummary project={project} board={board} />
        <ProjectPropertiesCard project={project} />
      </div>
      <div className="min-w-0 desktop:col-start-1 desktop:row-start-2">
        <ProjectActivityFeed projectId={project.id} />
      </div>
    </div>
  );
}
