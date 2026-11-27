import type { ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { ProjectDescriptionSection } from './ProjectDescriptionSection';
import { ProjectPropertiesCard } from './ProjectPropertiesCard';
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
            <div className="relative aspect-project-cover max-h-48 overflow-hidden rounded-lg">
              <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="absolute inset-0 size-full object-cover" />
              <div className="absolute bottom-3 right-3">{coverAction}</div>
            </div>
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
      <div className="flex min-w-0 flex-col gap-4">
        <ProjectPropertiesCard project={project} />
        <ProjectSummaryCard project={project} fitCalendar />
      </div>
    </div>
  );
}
