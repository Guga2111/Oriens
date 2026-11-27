import type { ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { ProjectDescriptionSection } from './ProjectDescriptionSection';
import { ProjectSummaryCard } from './ProjectSummaryCard';
import type { WorkProject } from '@/types/work';

interface ProjectOverviewProps {
  project: WorkProject;
  notices: ReactNode;
  coverPending: boolean;
  onChooseCover: () => void;
  onReload: () => void;
}

export function ProjectOverview({ project, notices, coverPending, onChooseCover, onReload }: ProjectOverviewProps) {
  const coverAction = <Button type="button" variant="outline" size="sm" disabled={coverPending} onClick={onChooseCover}>
    <ImagePlus aria-hidden />
    {coverPending ? 'Salvando capa…' : project.imageUrl ? 'Trocar capa' : 'Adicionar capa'}
  </Button>;

  return (
    <div className="grid min-w-0 items-start gap-8 desktop:grid-cols-project-detail">
      <article className="flex min-w-0 flex-col gap-6">
        <header className="flex min-w-0 flex-col gap-4">
          {project.imageUrl && (
            <AspectRatio ratio={3} className="overflow-hidden rounded-lg">
              <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="size-full object-cover" />
              <div className="absolute bottom-3 right-3">{coverAction}</div>
            </AspectRatio>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="min-w-0 break-words text-page-title font-semibold tracking-tight">{project.title}</h1>
            {!project.imageUrl && coverAction}
          </div>
        </header>
        {notices}
        <ProjectDescriptionSection project={project} onReload={onReload} />
        <ProjectActivityFeed projectId={project.id} />
      </article>
      <ProjectSummaryCard project={project} fitCalendar />
    </div>
  );
}
