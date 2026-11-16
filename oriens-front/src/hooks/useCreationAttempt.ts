import { useCallback, useRef, useState } from 'react';
import { isAxiosError } from 'axios';

/** Retain the exact payload and key for an uncertain mutation, including its original versions. */
export function useCreationAttempt() {
  const attempt = useRef<{ body: string; key: string; createdAt: number } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const reset = useCallback(() => { attempt.current = null; setUncertain(false); }, []);
  return {
    uncertain,
    prepare<T>(body: T): { body: T; key: string } {
      if (attempt.current && Date.now() - attempt.current.createdAt >= 24 * 60 * 60 * 1000) {
        throw new Error('Esta tentativa expirou. Confira se o registro foi criado antes de iniciar outro pedido.');
      }
      attempt.current ??= { body: JSON.stringify(body), key: crypto.randomUUID(), createdAt: Date.now() };
      return { body: JSON.parse(attempt.current.body) as T, key: attempt.current.key };
    },
    failed(error: unknown) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      const code = isAxiosError(error) ? error.response?.data?.code : undefined;
      if (status && status < 500 && !['RESOURCE_GONE', 'IDEMPOTENCY_CONFLICT'].includes(code) && ![408, 425, 429].includes(status)) { attempt.current = null; setUncertain(false); }
      else setUncertain(true);
    },
    reset,
  };
}
