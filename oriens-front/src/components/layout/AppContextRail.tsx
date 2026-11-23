import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { appContexts, getAppContext } from './app-contexts';

export function AppContextRail() {
  const { pathname } = useLocation();
  const active = getAppContext(pathname);

  return (
    <nav aria-label="Contextos" className="flex w-rail shrink-0 flex-col bg-background py-2">
      <ul className="flex min-h-0 flex-1 flex-col items-center gap-2">
        {appContexts.map(context => (
          <li key={context.id} className={cn(context.id === 'settings' && 'mt-auto')}>
            <Button asChild variant="ghost" className="h-auto w-11 flex-col gap-1 rounded-md px-0 py-1 text-xs font-normal hover:bg-transparent">
              <Link aria-label={context.label} to={context.items[0].url} aria-current={active.id === context.id ? 'page' : undefined} className="group/context">
                <span className={cn('flex size-8 items-center justify-center rounded-md group-hover/context:bg-accent', active.id === context.id ? 'bg-accent text-foreground' : 'text-muted-foreground')}>
                  <context.icon aria-hidden />
                </span>
                <span>{context.railLabel}</span>
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
