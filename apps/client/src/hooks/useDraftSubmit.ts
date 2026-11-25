import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useCreationAttempt } from './useCreationAttempt';

/**
 * One write intention per open form: a retry after an uncertain failure resends the same body and
 * Idempotency-Key, and the draft stays locked until the outcome is known.
 */
export function useDraftSubmit<T, R>(send: (body: T, key: string) => Promise<R>) {
  const attempt = useCreationAttempt();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const submit = async (body: T): Promise<R | undefined> => {
    if (pending) return undefined;
    setPending(true);
    setFailure(null);
    try {
      const command = attempt.prepare(body);
      const result = await send(command.body, command.key);
      attempt.reset();
      return result;
    } catch (error) {
      attempt.failed(error);
      setFailure(error);
      return undefined;
    } finally {
      setPending(false);
    }
  };

  const reset = () => { attempt.reset(); setFailure(null); };
  return { submit, pending, failure, uncertain: attempt.uncertain, reset };
}

/** Message for the form's feedback; undefined lets `WorkFeedback` describe the API error. */
export function draftFailureMessage(failure: unknown, uncertain: boolean, action: string): string | undefined {
  if (failure instanceof Error && !isAxiosError(failure)) return failure.message;
  if (uncertain && !(isAxiosError(failure) && [409, 410].includes(failure.response?.status ?? 0)))
    return `Confirmação indisponível. Seu rascunho foi mantido. Repita pelo botão ${action} para verificar o mesmo pedido sem duplicá-lo.`;
  return undefined;
}

/** A confirmed deletion keeps one key while its dialog stays open, so a retry cannot delete twice. */
export function useDeletion<T>(remove: (target: T, key: string) => Promise<void>) {
  const attempt = useCreationAttempt();
  const [target, setTarget] = useState<T | null>(null);
  const confirm = async () => {
    if (target === null) return;
    const command = attempt.prepare(target);
    try { await remove(command.body, command.key); attempt.reset(); }
    catch (error) { attempt.failed(error); throw error; }
  };
  const close = () => { setTarget(null); attempt.reset(); };
  return { target, ask: setTarget, confirm, close };
}
