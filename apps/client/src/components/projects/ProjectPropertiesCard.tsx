import { useId, type CSSProperties } from 'react';
import { CircleDot, Kanban, Palette, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { WorkProject } from '@/types/work';

export function ProjectPropertiesCard({ project }: { project: WorkProject }) {
  const headingId = useId();
  const color = project.color;
  const properties = [
    { label: 'Situação', icon: CircleDot, value: <Badge variant="secondary">{project.archived ? 'Arquivado' : 'Ativo'}</Badge> },
    { label: 'Tipo', icon: Kanban, value: project.mode === 'DEVELOPMENT' ? 'Desenvolvimento' : 'Simples' },
    {
      label: 'Cor', icon: Palette,
      value: color ? (
        <span className="inline-flex max-w-full items-center gap-2">
          <span aria-hidden className="size-3 shrink-0 rounded-full border bg-[var(--project-color)]"
            style={{ '--project-color': color } as CSSProperties} />
          <span className="break-all">{color.toUpperCase()}</span>
        </span>
      ) : <span className="text-muted-foreground">Sem cor</span>,
    },
    { label: 'Favorito', icon: Star, value: project.favorite ? 'Sim' : 'Não' },
  ];

  return (
    <section aria-labelledby={headingId}>
      <Card className="space-y-4 p-4 shadow-none md:p-5">
        <h2 id={headingId} className="text-base font-semibold">Propriedades</h2>
        <dl className="grid grid-cols-2 items-center gap-x-3 gap-y-3 text-sm">
          {properties.map(({ label, icon: Icon, value }) => (
            <div key={label} className="contents">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
              </dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}
