import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { mcpError } from '@/lib/mcp';
import { isAxiosError } from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { mcpFlow } from '@/lib/mcp';

export function McpFeedback({ error, message, retry, retryLabel = 'Tentar novamente' }: { error?: unknown; message?: string; retry?: () => void; retryLabel?: string }) {
  const location = useLocation();
  if (!error && !message) return null;
  const flow = mcpFlow(location.search);
  return <Alert role={error ? 'alert' : 'status'}><AlertDescription className="flex flex-col items-start gap-3">
    <span>{message || mcpError(error)}</span>
    {isAxiosError(error) && error.response?.status === 401
      ? <Button className="min-h-11 max-md:min-h-11" asChild variant="outline"><Link to={flow ? `/auth?mcpFlow=${flow}` : '/auth'}>Entrar novamente</Link></Button>
      : retry && <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" onClick={retry}>{retryLabel}</Button>}
  </AlertDescription></Alert>;
}
