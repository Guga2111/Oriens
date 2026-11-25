import api from './api';
import type { QuickLink, LinkInput, RecentItem, RecentType } from '@/types/home';

const base = '/work/home';
export const homeService = {
  links: async (signal?: AbortSignal) => (await api.get<QuickLink[]>(`${base}/quick-links`, { signal })).data,
  create: async (body: LinkInput, key: string) => (await api.post<QuickLink>(`${base}/quick-links`, body, { headers: { 'Idempotency-Key': key } })).data,
  update: async (link: QuickLink, body: LinkInput) => (await api.patch<QuickLink>(`${base}/quick-links/${link.id}`, body, { headers: { 'If-Match': `"${link.version}"` } })).data,
  remove: async (link: QuickLink) => { await api.delete(`${base}/quick-links/${link.id}`, { headers: { 'If-Match': `"${link.version}"` } }); },
  recents: async (signal?: AbortSignal) => (await api.get<RecentItem[]>(`${base}/recents`, { signal })).data,
  visit: async (type: RecentType, resourceId: number) => { await api.post(`${base}/recents`, { type, resourceId }); },
};
