import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { workKey } from './useWork';
import { investmentService } from '@/services/investmentService';
import type { MovementFilters } from '@/types/investment';

/** Portfolio reads live under the `financial` family, which every financial write invalidates. */
export function useInvestments(page: number) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'investments', 'list', page), enabled: userId !== null,
    placeholderData: keepPreviousData, queryFn: ({ signal }) => investmentService.list(userId!, page, signal) });
}

export function useInvestmentSummary() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'investments', 'summary'), enabled: userId !== null,
    queryFn: ({ signal }) => investmentService.summary(userId!, signal) });
}

export function useInvestmentMovements(filters: MovementFilters) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'investments', 'movements', filters), enabled: userId !== null,
    placeholderData: keepPreviousData, queryFn: ({ signal }) => investmentService.movements(userId!, filters, signal) });
}

export function useInvestmentValuations(id: number | null) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'investments', 'valuations', id), enabled: userId !== null && id !== null,
    queryFn: ({ signal }) => investmentService.valuations(userId!, id!, signal) });
}
