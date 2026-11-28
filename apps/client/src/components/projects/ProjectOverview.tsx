import type { ReactNode, RefObject } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { ProjectSummaryCard } from './ProjectSummaryCard';
import type { WorkProject } from '@/types/work';

interface ProjectOverviewProps {
  project: WorkProject;
  descriptionTrigger: RefObject<HTMLButtonElement>;
  notices: ReactNode;
  onEditDescription: () => void;
}

export function ProjectOverview({ project, descriptionTrigger, notices, onEditDescription }: ProjectOverviewProps) {
  const hasDescription = Boolean(project.description?.trim());
  const DescriptionIcon = hasDescription ? Pencil : Plus;

  return (
    <div className="grid min-w-0 items-start gap-8 desktop:grid-cols-project-detail">
      <article className="flex min-w-0 flex-col gap-6">
        {project.imageUrl && (
          <AspectRatio ratio={3} className="overflow-hidden rounded-lg">
            <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="size-full object-cover" />
          </AspectRatio>
        )}
        <h1 className="break-words text-page-title font-semibold tracking-tight">{project.title}</h1>
        {notices}
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="project-description-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="project-description-heading" className="text-base font-semibold">Descrição</h2>
            <Button ref={descriptionTrigger} type="button" variant="outline" size="sm" onClick={onEditDescription}>
              <DescriptionIcon data-icon="inline-start" aria-hidden />
              {hasDescription ? 'Editar descrição' : 'Adicionar descrição'}
            </Button>
          </div>
          {hasDescription ? (
            <p className="max-w-prose whitespace-pre-wrap break-words leading-relaxed">{project.description}</p>
          ) : (
            <Empty className="items-start border p-4 text-left md:p-4">
              <EmptyDescription>Inclua o propósito, o escopo ou os próximos passos do projeto.</EmptyDescription>
            </Empty>
          )}
        </section>
      </article>
      <ProjectSummaryCard project={project} fitCalendar />
    </div>
  );
}
