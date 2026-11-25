import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { homeService } from '@/services/homeService';
import { workKey } from './useWork';
import type { QuickLink, LinkInput, RecentType } from '@/types/home';

export function useHomeLinks() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'home', 'links'), enabled: userId !== null,
    queryFn: ({ signal }) => homeService.links(signal) });
}
export function useHomeRecents() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'home', 'recents'), enabled: userId !== null,
    queryFn: ({ signal }) => homeService.recents(signal) });
}
export function useHomeLinkWrites() {
  const { userId } = useAuth();
  const client = useQueryClient();
  return useMutation({ retry: false,
    mutationFn: (command: { kind: 'save'; link?: QuickLink; body: LinkInput; key?: string } | { kind: 'remove'; link: QuickLink }): Promise<QuickLink | void> => {
      if (command.kind === 'remove') return homeService.remove(command.link);
      return command.link ? homeService.update(command.link, command.body) : homeService.create(command.body, command.key!);
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: workKey(userId, 'home', 'links') }); },
    onError: () => { void client.invalidateQueries({ queryKey: workKey(userId, 'home', 'links') }); },
  });
}

/** Record only an explicit open, once per mounted resource; never a query or prefetch. */
export function useRecordVisit(type: RecentType, resourceId?: number) {
  const { userId } = useAuth();
  const client = useQueryClient();
  const last = useRef('');
  const { mutate } = useMutation({ retry: false,
    mutationFn: (id: number) => homeService.visit(type, id),
    onSuccess: () => { void client.invalidateQueries({ queryKey: workKey(userId, 'home', 'recents') }); },
    onError: error => {
      // Archived projects and their tasks open normally but stay out of the recents (the API answers 404).
      if (isAxiosError(error) && error.response?.status === 404) return;
      toast.error('Não foi possível atualizar os recentes. Você pode continuar trabalhando.');
    },
  });
  useEffect(() => {
    const key = `${userId}:${type}:${resourceId}`;
    if (userId === null || !resourceId || last.current === key) return;
    last.current = key;
    mutate(resourceId);
  }, [userId, type, resourceId, mutate]);
}
