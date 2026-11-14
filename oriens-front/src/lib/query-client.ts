import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient();

queryClient.setQueryDefaults(['work'], { staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: true });
