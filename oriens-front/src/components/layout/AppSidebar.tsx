import { useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronDown, Circle, PanelLeftClose, Plus, Star } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useAuth } from '@/context/AuthContext';
import { useProjectFlags, useWorkSidebar } from '@/hooks/useWork';
import { cn } from '@/lib/utils';
import { getAppContext, isContextItemActive } from './app-contexts';

const projectTabs = [
  { value: 'board', label: 'Quadro' },
  { value: 'objectives', label: 'Objetivos' },
  { value: 'timeline', label: 'Linha do tempo' },
];

function SidebarProjects({ projectsVersion }: { projectsVersion: number }) {
  const sidebar = useWorkSidebar();
  const flags = useProjectFlags();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { refetch } = sidebar;
  const tab = projectTabs.some(item => item.value === params.get('tab')) ? params.get('tab') : 'board';

  useEffect(() => {
    if (projectsVersion > 0) void refetch();
  }, [projectsVersion, refetch]);

  return (
    <Collapsible defaultOpen className="group/projects">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="max-desktop:min-h-10">
            Projetos
            <ChevronDown aria-hidden className="ml-auto transition-transform group-data-[state=closed]/projects:-rotate-90 motion-reduce:transition-none" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <WorkFeedback error={sidebar.error || flags.error} retry={() => void sidebar.refetch()} />
            <SidebarMenu>
              {sidebar.isPending ? (
                <SidebarMenuItem><SidebarMenuSkeleton showIcon /><span className="sr-only" role="status">Carregando projetos…</span></SidebarMenuItem>
              ) : (sidebar.data ?? []).map(project => {
                const active = pathname === `/tasks/project/${project.id}`;
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild isActive={active} className="max-desktop:min-h-10">
                      <Link to={`/tasks/project/${project.id}`} aria-current={active ? 'page' : undefined}>
                        <Circle aria-hidden className={cn('size-3 shrink-0 fill-current', !project.color && 'text-muted-foreground')} style={project.color ? { color: project.color } : undefined} />
                        <span className="truncate">{project.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      aria-label={`${project.favorite ? 'Desfavoritar' : 'Favoritar'} ${project.title}`}
                      aria-pressed={project.favorite}
                      disabled={flags.isPending}
                      className="size-7 top-0.5 max-desktop:size-10 max-desktop:top-0 max-desktop:right-0"
                      onClick={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}
                    >
                      <Star aria-hidden className={cn(project.favorite ? 'fill-current text-sidebar-primary' : 'text-muted-foreground')} />
                    </SidebarMenuAction>
                    {active && project.mode === 'DEVELOPMENT' && (
                      <SidebarMenuSub>
                        {projectTabs.map(item => (
                          <SidebarMenuSubItem key={item.value}>
                            <SidebarMenuSubButton asChild isActive={tab === item.value} className="max-desktop:min-h-10">
                              <Link to={`/tasks/project/${project.id}?tab=${item.value}`} aria-current={tab === item.value ? 'page' : undefined}>
                                {item.label}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {!sidebar.isPending && !sidebar.error && sidebar.data?.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Nenhum projeto recente.</p>
            )}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

type AppSidebarProps = {
  projectsVersion?: number;
  onNewTask: () => void;
};

export function AppSidebar({ projectsVersion = 0, onNewTask }: AppSidebarProps) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const context = getAppContext(pathname);

  const renderItems = (items: typeof context.items) => (
    <SidebarMenu>
      {items.map(item => {
        const active = isContextItemActive(item, pathname);
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={active} className="max-desktop:min-h-10">
              <Link to={item.url} aria-current={active ? 'page' : undefined}>
                <item.icon aria-hidden />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="none" data-sidebar="sidebar" className="min-w-0 shrink-0 border-r border-sidebar-border max-desktop:flex-1">
      <SidebarHeader className="h-app-header shrink-0 justify-center border-b border-sidebar-border px-4 py-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base font-semibold">{context.label}</span>
          <Button variant="ghost" size="icon" className="size-7 max-desktop:size-10" aria-label="Esconder menu" aria-expanded={isMobile ? openMobile : open} onClick={toggleSidebar}>
            <PanelLeftClose aria-hidden />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={`Menu de ${context.label}`}>
          {context.id === 'work' && (
            <div className="px-3 pt-3">
              <Button variant="outline" className="w-full justify-start max-desktop:min-h-10" onClick={onNewTask}>
                <Plus aria-hidden />Nova tarefa
              </Button>
            </div>
          )}
          <SidebarGroup><SidebarGroupContent>{renderItems(context.items)}</SidebarGroupContent></SidebarGroup>
          {context.id === 'work' && <SidebarProjects projectsVersion={projectsVersion} />}
          {role === 'ADMIN' && context.adminItems && (
            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>{renderItems(context.adminItems)}</SidebarGroupContent>
            </SidebarGroup>
          )}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
