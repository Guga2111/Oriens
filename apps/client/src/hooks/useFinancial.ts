import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { workKey } from './useWork';
import { getAllTags, getEntryLedger } from '@/services/financialService';

/** Account-scoped history behind the overview; financial writes invalidate the `financial` family. */
export function useFinancialLedger() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'ledger'), enabled: userId !== null,
    queryFn: ({ signal }) => getEntryLedger(userId!, signal) });
}

/** The account's categories, shared by the overview and the entries page. */
export function useFinancialTags() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'tags'), enabled: userId !== null,
    queryFn: () => getAllTags(userId!) });
}
