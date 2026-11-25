import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { workKey } from './useWork';
import { getEntryLedger } from '@/services/financialService';

/** Account-scoped history behind the overview; financial writes invalidate the `financial` family. */
export function useFinancialLedger() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'financial', 'ledger'), enabled: userId !== null,
    queryFn: ({ signal }) => getEntryLedger(userId!, signal) });
}
