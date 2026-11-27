export type RecentType = 'TASK' | 'PROJECT';
export interface QuickLink { id: number; name: string; url: string; createdAt: string; version: number }
export interface LinkInput { name: string; url: string }
export interface RecentItem { type: RecentType; resourceId: number; title: string; visitedAt: string; imageUrl?: string | null }
