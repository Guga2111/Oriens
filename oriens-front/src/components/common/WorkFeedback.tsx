import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { workError } from '@/lib/work-form';

export function WorkFeedback({ error, message, retry }: { error?: unknown; message?: string; retry?: () => void }) {
  if (!error && !message) return null;
  return <Alert role={error ? 'alert' : 'status'}><AlertDescription className="flex flex-wrap items-center gap-2">
    <span>{message || workError(error)}</span>
    {retry && <Button type="button" variant="outline" size="sm" onClick={retry}>Recarregar dados</Button>}
  </AlertDescription></Alert>;
}
