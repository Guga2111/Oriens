import { useId, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export function AnalysisPanel({ title, description, action, children, className }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  return <Card role="region" aria-labelledby={id} className={cn('w-full', className)}>
    <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1"><CardTitle><h2 id={id} className="text-base leading-6">{title}</h2></CardTitle>{description && <CardDescription>{description}</CardDescription>}</div>
      {action && <div className="shrink-0">{action}</div>}
    </CardHeader><CardContent className="p-4 pt-0">{children}</CardContent>
  </Card>;
}
export function QueryContent<T>({ query, children, label = 'os dados' }: { query: UseQueryResult<T, Error>; children: (data: T) => ReactNode; label?: string }) {
  if (!query.data) return query.isPending ? <div role="status" aria-label={`Carregando ${label}`} className="flex flex-col gap-3"><Skeleton className="h-7 w-28" /><Skeleton className="h-28 w-full" /></div>
    : <Alert><AlertDescription>Não foi possível carregar {label}. <Button variant="link" onClick={() => void query.refetch()}>Tentar novamente</Button></AlertDescription></Alert>;
  return <div aria-busy={query.isFetching}>{query.isError && <Alert className="mb-3"><AlertDescription>Atualização falhou. Mantendo os dados de {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt)}. <Button variant="link" onClick={() => void query.refetch()}>Tentar novamente</Button></AlertDescription></Alert>}{children(query.data)}</div>;
}
export function AnalysisEmpty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Empty><EmptyHeader><EmptyTitle><h3>{title}</h3></EmptyTitle>{description && <EmptyDescription>{description}</EmptyDescription>}</EmptyHeader>{action && <EmptyContent>{action}</EmptyContent>}</Empty>;
}
