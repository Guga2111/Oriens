import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { createEntry, updateEntry, deleteEntry } from '@/services/financialService';
import { CreateEntryDialog } from '@/components/financial/CreateEntryDialog';
import { EditEntryDialog } from '@/components/financial/EditEntryDialog';
import { EntryHistoryTable } from '@/components/financial/EntryHistoryTable';
import { financialAmountError } from '@/lib/financial-form';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { post: vi.fn(), put: vi.fn(), delete: vi.fn(), get: vi.fn() } }));
const entry = { id: 1, version: 3, amount: -12.34, entryDate: '2026-11-16', tagId: 1, description: 'Café', isRecurring: false };
const tags = [{ id: 1, name: 'Alimentação', color: '#781336' }];
const network = () => ({ isAxiosError: true, message: 'offline' });
const conflict = () => ({ isAxiosError: true, response: { status: 409, data: { code: 'VERSION_CONFLICT' } } });
beforeEach(() => { vi.resetAllMocks(); });

it('REST exige chave/versão e só envia estado editável', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: entry }); vi.mocked(api.put).mockResolvedValue({ data: entry }); vi.mocked(api.delete).mockResolvedValue({});
  const key = crypto.randomUUID();
  await createEntry(7, entry, key); await updateEntry(7, 1, entry, key); await deleteEntry(7, 1, 3, key);
  expect(api.post).toHaveBeenCalledWith('/financial/user/7/entries', expect.not.objectContaining({ id: 1 }), { headers: { 'Idempotency-Key': key } });
  expect(api.put).toHaveBeenCalledWith('/financial/user/7/entries/1', expect.objectContaining({ amount: -12.34, description: 'Café' }), { headers: { 'Idempotency-Key': key, 'If-Match': '"3"' } });
  expect(api.delete).toHaveBeenCalledWith('/financial/user/7/entries/1', { headers: { 'Idempotency-Key': key, 'If-Match': '"3"' } });
  await expect(updateEntry(7, 1, { ...entry, version: undefined } as unknown as typeof entry, key)).rejects.toThrow('versão');
  await expect(deleteEntry(7, 1, undefined as unknown as number, key)).rejects.toThrow('versão');
  await expect(createEntry(7, entry, '')).rejects.toThrow('chave');
});

describe('limites monetários', () => {
  it.each(['0', '0.00', '-0.01', '9999999999.99', '-9999999999.99'])('aceita %s', value => expect(financialAmountError(value)).toBeNull());
  it.each(['', '1.234', '10000000000.00', 'NaN', '1e2', '1,00'])('recusa %s', value => expect(financialAmountError(value)).not.toBeNull());
});

it('edição incerta repete exatamente chave, versão e payload e bloqueia mudanças do rascunho', async () => {
  const user = userEvent.setup(), onSuccess = vi.fn();
  vi.mocked(api.put).mockRejectedValueOnce(network()).mockResolvedValueOnce({ data: { ...entry, version: 4 } });
  render(<EditEntryDialog open onOpenChange={vi.fn()} onSuccess={onSuccess} entry={entry} tags={tags} />);
  await user.clear(screen.getByLabelText('Valor')); await user.type(screen.getByLabelText('Valor'), '-20.10');
  await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await screen.findByText(/Confirmação indisponível/);
  expect(screen.getByLabelText('Valor')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.put).mock.calls[1]).toEqual(vi.mocked(api.put).mock.calls[0]);
  expect(onSuccess).toHaveBeenCalledTimes(1);
});

it('conflito mantém rascunho, bloqueia reenvio e só adota nova versão após recarga explícita', async () => {
  const user = userEvent.setup(); vi.mocked(api.put).mockRejectedValueOnce(conflict()).mockResolvedValueOnce({ data: entry });
  vi.mocked(api.get).mockResolvedValue({ data: { ...entry, version: 4, amount: -15, description: 'Atualizado pela IA' } });
  render(<EditEntryDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} entry={entry} tags={tags} />);
  await user.clear(screen.getByLabelText('Valor')); await user.type(screen.getByLabelText('Valor'), '-20');
  await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  const reload = await screen.findByRole('button', { name: 'Descartar rascunho e recarregar' });
  expect(screen.getByLabelText('Valor')).toHaveValue(-20); expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
  await user.click(reload); await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue(-15));
  await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.put).mock.calls[1][2]).toEqual({ headers: { 'If-Match': '"4"', 'Idempotency-Key': expect.any(String) } });
  expect(vi.mocked(api.put).mock.calls[1][2]).not.toEqual(vi.mocked(api.put).mock.calls[0][2]);
});

it('criação incerta conserva a chave e não envia um segundo lançamento', async () => {
  const user = userEvent.setup();vi.mocked(api.post).mockRejectedValueOnce(network()).mockResolvedValueOnce({ data: entry });
  render(<CreateEntryDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} tags={tags} />);
  await user.type(screen.getByLabelText('Valor'), '0');
  await user.click(screen.getByRole('combobox'));await user.click(screen.getByRole('option', { name: 'Alimentação' }));
  await user.click(screen.getByRole('button', { name: 'Criar Entrada' })); await screen.findByText(/Confirmação indisponível/);
  await user.click(screen.getByRole('button', { name: 'Criar Entrada' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.post).mock.calls[1]).toEqual(vi.mocked(api.post).mock.calls[0]);
});

it('exclusão mantém a confirmação aberta e a chave quando a rede falha', async () => {
  const user = userEvent.setup(); const remove = vi.fn().mockRejectedValueOnce(network()).mockResolvedValueOnce(undefined);
  render(<EntryHistoryTable entries={[entry]} tags={tags} onEdit={vi.fn()} onDelete={remove}
    pagination={{ page: 0, totalPages: 1, totalElements: 1 }} onPageChange={vi.fn()}
    onManageRecurrences={vi.fn()} filtered={false} onClearFilters={vi.fn()} />);
  await user.click(screen.getAllByRole('button', { name: 'Excluir entrada: Café' })[0]);
  const dialog = await screen.findByRole('alertdialog');await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));
  await within(dialog).findByRole('alert');await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));
  await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));expect(remove.mock.calls[1]).toEqual(remove.mock.calls[0]);
});
