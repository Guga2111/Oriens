import { Plus } from 'lucide-react';
import { useState } from 'react';
import { HeaderActions } from '@/components/common/HeaderActions';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilterMenu } from '@/components/projects/ProjectFilterMenu';
import { activeProjectFilterCount, NO_PROJECT_FILTERS, projectQueryOf } from '@/lib/project-filters';
import { ProjectSkeleton } from '@/components/projects/ProjectSkeleton';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useProjectPages } from '@/hooks/useWork';
import type { WorkProject } from '@/types/work';

export default function ProjectsPage() {
  const [filters, setFilters] = useState(NO_PROJECT_FILTERS);
  const projects = useProjectPages(projectQueryOf(filters));
  const [edit, setEdit] = useState<WorkProject | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<WorkProject | null>(null);
  const rows = projects.data?.pages.flatMap(p => p.content) ?? [];
  const filtered = activeProjectFilterCount(filters) > 0;
  return <div className="min-w-0 w-full">
    {/* The breadcrumb names the page, as on plane.so; the h1 stays for screen readers and page structure. */}
    <h1 className="sr-only">Projetos</h1>
    <HeaderActions><ProjectFilterMenu filters={filters} onChange={setFilters} /><Button size="sm" onClick={() => { setEdit(null); setCreating(true); }}><Plus aria-hidden />Novo projeto</Button></HeaderActions>
    <div className="space-y-4">
    <WorkFeedback error={projects.error} message={projects.isError ? 'Não foi possível atualizar os projetos. Os dados carregados foram mantidos.' : undefined} retry={() => void projects.refetch()} />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map(p => <ProjectCard key={p.id} project={p} onEdit={p => { setEdit(p); setCreating(true); }} onDelete={id => setDeleting(rows.find(p => p.id === id) ?? null)} />)}
      {projects.isPending && <ProjectSkeleton />}
    </div>
    </div>
    {!projects.isPending && !projects.isError && rows.length === 0 && <Empty><EmptyHeader><EmptyTitle>{filtered ? 'Nenhum projeto com esses filtros' : 'Nenhum projeto ainda'}</EmptyTitle><EmptyDescription>{filtered ? 'Ajuste ou limpe os filtros para ver outros projetos.' : 'Crie um projeto simples ou organize tarefas em um quadro.'}</EmptyDescription></EmptyHeader></Empty>}
    {projects.hasNextPage && <Button className="mt-6" variant="outline" disabled={projects.isFetchingNextPage} onClick={() => void projects.fetchNextPage()}>Carregar mais</Button>}
    <CreateProjectDialog open={creating} onOpenChange={setCreating} projectToEdit={edit} onSuccess={() => {}} />
    {deleting && <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDeleting(null)} />}
  </div>;
}
