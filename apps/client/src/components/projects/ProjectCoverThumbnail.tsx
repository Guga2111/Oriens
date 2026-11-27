import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProjectCoverThumbnailProps {
  imageUrl?: string | null;
  className?: string;
  fallback?: ReactNode;
}

export function ProjectCoverThumbnail({ imageUrl, className, fallback }: ProjectCoverThumbnailProps) {
  if (!imageUrl) return fallback ?? null;
  return <img src={imageUrl} alt="" loading="lazy" className={cn('size-4 shrink-0 rounded-sm object-cover', className)} />;
}
