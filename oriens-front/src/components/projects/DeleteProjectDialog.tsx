import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useDeletionPreview, useProjectWrites } from '@/hooks/useWork';
import type { WorkProject } from '@/types/work';

export function DeleteProjectDialog({ project, onClose, onDeleted }: { project: WorkProject; onClose: () => void; onDeleted: () => void }) {
  const preview = useDeletionPreview(project.id);
  const write = useProjectWrites();
  const [acceptedVersion, setAcceptedVersion] = useState<number | null>(null);
  const data = preview.data;
  return <ResponsiveDialog open onOpenChange={v => { if (!v && !write.isPending) onClose(); }} title="Excluir projeto?"
    description={project.title} footer={<><Button variant="ghost" disabled={write.isPending} onClick={onClose}>Cancelar</Button><Button variant="destructive" disabled={!data || preview.isFetching || write.isPending || acceptedVersion !== data.projectVersion}
      onClick={async () => { try { await write.mutateAsync({ action: 'delete', id: project.id, version: data!.projectVersion }); onDeleted(); } catch { setAcceptedVersion(null); } }}>Excluir projeto</Button></>}>
    {preview.isPending && <p role="status">Consultando consequências…</p>}
    <WorkFeedback error={preview.error || write.error} retry={() => { setAcceptedVersion(null); void preview.refetch(); }} />
    {data && <div className="flex flex-col gap-4 text-sm"><p>Serão removidos {data.objectiveCount} objetivos e {data.columnCount} colunas. As {data.taskCount} tarefas serão preservadas como avulsas, com os mesmos estados e datas. Esta ação não pode ser desfeita.</p>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={acceptedVersion === data.projectVersion} onChange={e => setAcceptedVersion(e.target.checked ? data.projectVersion : null)} />Entendi as consequências para este projeto.</label></div>}
  </ResponsiveDialog>;
}
