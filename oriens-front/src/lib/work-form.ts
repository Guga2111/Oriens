import { isValid, parse, format } from 'date-fns';
import { isAxiosError } from 'axios';
import { TASK_STATUS } from '@/lib/labels';
import type { TaskStatus } from '@/types/task';

export function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parse(value, 'yyyy-MM-dd', new Date(2000, 0, 1));
  return isValid(date) && format(date, 'yyyy-MM-dd') === value;
}
export function workError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) return 'Os dados mudaram em outra sessão. Seu rascunho foi mantido. Recarregue os dados antes de tentar salvar novamente.';
    if (error.response?.status === 404) return 'Recurso indisponível ou sem acesso.';
    const data = error.response?.data;
    if (data?.fieldErrors?.length) return data.fieldErrors.map((e: { message: string }) => e.message).join(' ');
    if (data?.message) return data.message;
  }
  return 'Não foi possível salvar. Seu rascunho foi mantido. Tente novamente.';
}
export const statusNames = Object.fromEntries(Object.entries(TASK_STATUS).map(([value, config]) => [value, config.label])) as Record<TaskStatus, string>;
