import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Same shape as ProjectCard: cover, title, supporting line and a row of chips. */
export function ProjectSkeleton() {
  return (
    <Card className="overflow-hidden shadow-none" aria-hidden>
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4 pt-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </Card>
  );
}
