import { Plus, Archive } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectSkeleton } from '@/components/projects/ProjectSkeleton';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useProjectPages, useProjectTotals } from '@/hooks/useWork';
import type { WorkProject } from '@/types/work';

export default function ProjectsPage() {
  const projects = useProjectPages(); const totals = useProjectTotals();
  const [filter, setFilter] = useState('active');
  const [edit, setEdit] = useState<WorkProject | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<WorkProject | null>(null);
  const rows = projects.data?.pages.flatMap(p => p.content) ?? [];
  const visible = filter === 'favorites' ? rows.filter(p => p.favorite) : rows;
  return <div className="min-w-0 w-full">
    <PageHeader title="Projetos" description={totals.data ? `${totals.data.activeProjects} ativos · ${totals.data.favoriteProjects} favoritos na conta` : undefined}
      isLoading={projects.isFetching && !projects.isPending} actions={<Button className="max-sm:min-h-11" onClick={() => { setEdit(null); setCreating(true); }}><Plus aria-hidden />Novo projeto</Button>} />
    <div className="my-5 flex flex-wrap items-center justify-between gap-3"><ToggleGroup type="single" value={filter} onValueChange={v => v && setFilter(v)} aria-label="Filtrar projetos"><ToggleGroupItem value="active">Ativos</ToggleGroupItem><ToggleGroupItem value="favorites">Favoritos</ToggleGroupItem></ToggleGroup><Button asChild variant="link"><Link to="/all-data?tab=projects&archived=1"><Archive aria-hidden />Ver arquivados</Link></Button></div>
    <WorkFeedback error={totals.error} message={totals.isError ? 'Não foi possível atualizar o resumo da conta.' : undefined} retry={() => void totals.refetch()} />
    <WorkFeedback error={projects.error} message={projects.isError ? 'Não foi possível atualizar os projetos. Os dados carregados foram mantidos.' : undefined} retry={() => void projects.refetch()} />
    <div className={visible.length === 1 ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3"}>
      {visible.map(p => <ProjectCard key={p.id} project={p} onEdit={p => { setEdit(p); setCreating(true); }} onDelete={id => setDeleting(rows.find(p => p.id === id) ?? null)} />)}
      {projects.isPending && <ProjectSkeleton />}
    </div>
    {!projects.isPending && !projects.isError && visible.length === 0 && <Empty><EmptyHeader><EmptyTitle>{filter === 'favorites' ? 'Nenhum favorito nesta página' : 'Nenhum projeto ainda'}</EmptyTitle><EmptyDescription>{filter === 'favorites' ? 'Marque um projeto com a estrela ou carregue mais projetos.' : 'Crie um projeto simples ou organize tarefas em um quadro.'}</EmptyDescription></EmptyHeader></Empty>}
    {projects.hasNextPage && <Button className="mt-6" variant="outline" disabled={projects.isFetchingNextPage} onClick={() => void projects.fetchNextPage()}>Carregar mais</Button>}
    <CreateProjectDialog open={creating} onOpenChange={setCreating} projectToEdit={edit} onSuccess={() => {}} />
    {deleting && <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDeleting(null)} />}
  </div>;
}
