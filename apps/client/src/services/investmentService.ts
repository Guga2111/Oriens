import apiClient from './api';
import { financialChanged, preconditions } from './financialService';
import type { Page } from '@/types/financial';
import type {
  Investment, InvestmentCreate, InvestmentPatch, InvestmentSummary, Movement, MovementFilters, MovementInput, Valuation, ValuationInput,
} from '@/types/investment';

/** Lists are capped at 100 per page by the API. */
export const INVESTMENT_PAGE_SIZE = 100;
export const MOVEMENT_PAGE_SIZE = 20;
const base = (userId: number) => `/financial/user/${userId}/investments`;

/** Precondition errors reject like the request itself, so callers handle a single failure path. */
async function write<T>(userId: number, request: () => Promise<{ data: T }>): Promise<T> {
  const response = await request();
  financialChanged(userId);
  return response.data;
}

export const investmentService = {
  async list(userId: number, page: number, signal?: AbortSignal): Promise<Page<Investment>> {
    return (await apiClient.get(base(userId), { params: { page, size: INVESTMENT_PAGE_SIZE }, signal })).data;
  },
  async summary(userId: number, signal?: AbortSignal): Promise<InvestmentSummary> {
    return (await apiClient.get(`${base(userId)}/summary`, { signal })).data;
  },
  async valuations(userId: number, id: number, signal?: AbortSignal): Promise<Page<Valuation>> {
    return (await apiClient.get(`${base(userId)}/${id}/valuations`, { params: { page: 0, size: 100 }, signal })).data;
  },
  async movements(userId: number, filters: MovementFilters, signal?: AbortSignal): Promise<Page<Movement>> {
    const params = { page: filters.page, size: MOVEMENT_PAGE_SIZE, ...(filters.investmentId ? { investmentId: filters.investmentId } : {}) };
    return (await apiClient.get(`${base(userId)}/movements`, { params, signal })).data;
  },

  create: (userId: number, input: InvestmentCreate, key: string) =>
    write<Investment>(userId, () => apiClient.post(base(userId), input, { headers: preconditions(key) })),
  patch: (userId: number, id: number, version: number, input: InvestmentPatch, key: string) =>
    write<Investment>(userId, () => apiClient.patch(`${base(userId)}/${id}`, input, { headers: preconditions(key, version) })),
  remove: (userId: number, id: number, version: number, key: string) =>
    write<void>(userId, () => apiClient.delete(`${base(userId)}/${id}`, { headers: preconditions(key, version) })),

  addValuation: (userId: number, id: number, input: ValuationInput, key: string) =>
    write<Valuation>(userId, () => apiClient.post(`${base(userId)}/${id}/valuations`, input, { headers: preconditions(key) })),
  replaceValuation: (userId: number, valuation: Valuation, input: ValuationInput, key: string) =>
    write<Valuation>(userId, () => apiClient.put(`${base(userId)}/${valuation.investmentId}/valuations/${valuation.id}`, input,
      { headers: preconditions(key, valuation.version) })),
  removeValuation: (userId: number, valuation: Valuation, key: string) =>
    write<void>(userId, () => apiClient.delete(`${base(userId)}/${valuation.investmentId}/valuations/${valuation.id}`,
      { headers: preconditions(key, valuation.version) })),

  addMovement: (userId: number, id: number, input: MovementInput, key: string) =>
    write<Movement>(userId, () => apiClient.post(`${base(userId)}/${id}/movements`, input, { headers: preconditions(key) })),
  replaceMovement: (userId: number, movement: Movement, input: MovementInput, key: string) =>
    write<Movement>(userId, () => apiClient.put(`${base(userId)}/${movement.investmentId}/movements/${movement.id}`, input,
      { headers: preconditions(key, movement.version) })),
  removeMovement: (userId: number, movement: Movement, key: string) =>
    write<void>(userId, () => apiClient.delete(`${base(userId)}/${movement.investmentId}/movements/${movement.id}`,
      { headers: preconditions(key, movement.version) })),
};
