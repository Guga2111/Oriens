import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { workError } from '@/lib/work-form';

export function WorkFeedback({ error, message, retry, retryLabel = "Recarregar dados" }: { error?: unknown; message?: string; retry?: () => void; retryLabel?: string }) {
  if (!error && !message) return null;
  return <Alert role={error ? 'alert' : 'status'}><AlertDescription className="flex flex-wrap items-center gap-2">
    <span>{message || workError(error)}</span>
    {retry && <Button type="button" variant="outline" size="sm" onClick={retry}>{retryLabel}</Button>}
  </AlertDescription></Alert>;
}
