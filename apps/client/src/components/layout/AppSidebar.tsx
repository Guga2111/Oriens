import { useEffect, type CSSProperties } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Circle, PanelLeftClose, Pin, PinOff, Plus,
} from 'lucide-react';
import { OverviewIcon } from '@/components/icons/OverviewIcon';
import { ProjectCoverThumbnail } from '@/components/projects/ProjectCoverThumbnail';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useAuth } from '@/context/AuthContext';
import { useProjectFlags, useWorkSidebar } from '@/hooks/useWork';
import { PROJECT_SECTIONS, projectSectionOf, projectTabFrom, workViewOf } from '@/lib/project-tabs';
import { cn } from '@/lib/utils';
import { getAppContext, isContextItemActive } from './app-contexts';


function SidebarProjects({ projectsVersion, onNewProject }: { projectsVersion: number; onNewProject: () => void }) {
  const sidebar = useWorkSidebar();
  const flags = useProjectFlags();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { refetch } = sidebar;
  const tab = projectTabFrom(params.get('tab'));
  const section = projectSectionOf(tab);
  // "Itens de trabalho" keeps the view being used; from elsewhere it opens on the board.
  const sectionTab = (value: string) => value === 'work' ? workViewOf(tab) ?? 'board' : value;

  useEffect(() => {
    if (projectsVersion > 0) void refetch();
  }, [projectsVersion, refetch]);

  return (
    <Collapsible defaultOpen className="group/projects">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="relative pr-16 max-desktop:min-h-10 max-desktop:pr-24">
            Projetos
            <ChevronDown aria-hidden className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform group-data-[state=closed]/projects:-rotate-90 motion-reduce:transition-none" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <SidebarGroupAction showOnHover type="button" className="right-9 top-2.5 size-7 after:inset-0 max-desktop:top-2 max-desktop:size-10" aria-label="Criar projeto" onClick={onNewProject}>
          <Plus aria-hidden className="text-muted-foreground" />
        </SidebarGroupAction>
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
                    {/* Route activation resets the disclosure so deep links reveal their destination. */}
                    <Collapsible key={String(active)} defaultOpen={active} className="group/project">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="relative group-has-[[data-sidebar=menu-action]]/menu-item:pr-14 max-desktop:group-has-[[data-sidebar=menu-action]]/menu-item:pr-20 max-desktop:min-h-10 [&>svg:last-child]:size-3.5">
                          <ProjectCoverThumbnail imageUrl={project.imageUrl} fallback={
                            <Circle aria-hidden className={cn('size-3 shrink-0 fill-current', project.color ? 'text-[var(--project-color)]' : 'text-muted-foreground')} style={project.color ? { '--project-color': project.color } as CSSProperties : undefined} />
                          } />
                          <span className="truncate">{project.title}</span>
                          <ChevronRight aria-hidden className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground group-data-[state=open]/project:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <SidebarMenuAction
                        showOnHover={!project.favorite}
                        className="right-7 max-desktop:right-10"
                        aria-label={`${project.favorite ? 'Desafixar' : 'Fixar'} ${project.title}`}
                        aria-pressed={project.favorite}
                        disabled={flags.isPending}
                        onClick={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}
                      >
                        {project.favorite ? <PinOff aria-hidden className="text-muted-foreground" /> : <Pin aria-hidden className="text-muted-foreground" />}
                      </SidebarMenuAction>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {project.mode === 'DEVELOPMENT' ? PROJECT_SECTIONS.map(item => (
                            <SidebarMenuSubItem key={item.value}>
                              <SidebarMenuSubButton asChild isActive={active && section === item.value} className="max-desktop:min-h-10">
                                <Link to={`/tasks/project/${project.id}?tab=${active ? sectionTab(item.value) : item.value === 'work' ? 'board' : item.value}`} aria-current={active && section === item.value ? 'page' : undefined}>
                                  <item.icon aria-hidden />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )) : (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={active} className="max-desktop:min-h-10">
                                <Link to={`/tasks/project/${project.id}`} aria-current={active ? 'page' : undefined}>
                                  <OverviewIcon aria-hidden />
                                  <span>Visão geral</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
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
  onNewProject: () => void;
};

export function AppSidebar({ projectsVersion = 0, onNewTask, onNewProject }: AppSidebarProps) {
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
      <SidebarHeader className="h-app-header shrink-0 justify-center px-4 py-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base">{context.label}</span>
          <Button variant="ghost" size="icon" className="size-7 max-desktop:size-10" aria-label="Esconder menu" aria-expanded={isMobile ? openMobile : open} onClick={toggleSidebar}>
            <PanelLeftClose aria-hidden />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={`Menu de ${context.label}`}>
          {context.id === 'work' && (
            <div className="px-3 pb-2 pt-3">
              <Button variant="sidebar-action" className="w-full justify-start pl-2 font-normal max-desktop:min-h-10" onClick={onNewTask}>
                <Plus aria-hidden />Nova tarefa
              </Button>
            </div>
          )}
          <SidebarGroup><SidebarGroupContent>{renderItems(context.items)}</SidebarGroupContent></SidebarGroup>
          {context.id === 'work' && <SidebarProjects projectsVersion={projectsVersion} onNewProject={onNewProject} />}
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
