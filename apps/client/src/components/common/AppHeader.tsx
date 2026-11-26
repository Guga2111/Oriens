import { Link, useLocation, useMatch, useSearchParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useProjectBoard, useWorkProject } from "@/hooks/useWork";
import { getContextItem } from "@/components/layout/app-contexts";
import { boardFiltersFromParams } from "@/lib/project-filters";
import { PROJECT_SECTIONS, projectSectionOf, projectTabFrom } from "@/lib/project-tabs";
import { HeaderActionsSlot } from "./HeaderActions";

const sectionNames: Record<string, string> = {
  "/home": "Início",
  "/tasks": "Hoje",
  "/projects": "Projetos",
  "/stats": "Estatísticas",
  "/config": "Configurações",
  "/financial": "Financeiro",
  "/financial/entries": "Lançamentos",
  "/financial/investments": "Investimentos",
  "/all-data": "Explorar",
  "/support": "Ajuda & Suporte",
  "/admin/support": "Dashboard de Suporte",
  "/admin/management": "Gerenciar Admins",
};

const crumbLink = "inline-flex min-h-7 max-md:min-h-10 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ProjectBreadcrumb({ id }: { id: number }) {
  // The page uses this same query key: names follow edits without mirrored state.
  const { data: project, isPending } = useWorkProject(id);
  const [params] = useSearchParams();
  const title = project?.title ?? (id > 0 && isPending ? "Carregando projeto…" : "Projeto indisponível");
  // A development project has pages of its own (Panorama, Itens de trabalho, Objetivos), named after the project.
  const tab = projectTabFrom(params.get("tab"));
  const section = project?.mode === "DEVELOPMENT" ? PROJECT_SECTIONS.find(item => item.value === projectSectionOf(tab)) : undefined;
  const isBoard = section?.value === "work" && tab === "board";
  const { filters } = boardFiltersFromParams(params);
  const { data: board } = useProjectBoard(isBoard ? id : 0, filters, { enabled: false });
  const count = isBoard ? board?.visible.totalTasks : section?.value === "work" ? project?.summary.totalTasks : null;

  return (
    <>
      <BreadcrumbItem className="shrink-0 max-sm:hidden">
        <BreadcrumbLink asChild>
          <Link to="/projects" className={crumbLink}>Projetos</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator className="shrink-0 max-sm:hidden" />
      {section ? (
        <>
          {/* On a phone only the open section fits beside the page actions. */}
          <BreadcrumbItem className="min-w-0 max-sm:hidden">
            <BreadcrumbLink asChild>
              <Link to={`/tasks/project/${id}?tab=overview`} className={`${crumbLink} min-w-0`}><span className="truncate" title={title}>{title}</span></Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="shrink-0 max-sm:hidden" />
          <BreadcrumbItem className="min-w-0 shrink-0 max-sm:shrink">
            <BreadcrumbPage className="flex min-w-0 items-center gap-1.5">
              <section.icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{section.label}</span>
              {count != null && <Badge variant="secondary" className="h-5 shrink-0 rounded-md px-1.5 text-xs font-medium tabular-nums" aria-label={`${count} ${count === 1 ? "item" : "itens"}`}>{count}</Badge>}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </>
      ) : (
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate" title={title}>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      )}
    </>
  );
}

/**
 * Navegação de contexto do shell. Compartilha a altura com o topo da sidebar;
 * o único h1 e os metadados continuam no PageHeader; a ação principal da rota
 * pode vir para cá por `HeaderActions`.
 */
export function AppHeader() {
  const { pathname } = useLocation();
  const { isMobile, open } = useSidebar();
  const projectMatch = useMatch("/tasks/project/:id");
  const projectId = Number(projectMatch?.params.id);
  const validProject = Number.isSafeInteger(projectId) && projectId > 0;
  const sectionName = sectionNames[pathname.replace(/\/$/, "")] ?? "Oriens";
  const PageIcon = getContextItem(pathname)?.icon;

  return (
    <header className="flex h-app-header shrink-0 items-center gap-2 border-b border-sidebar-border bg-card px-5">
      {/* As on plane.so: the sidebar has its own close button, so the header offers the toggle only while
          the sidebar is hidden and otherwise shows the icon of the page being visited. */}
      {!isMobile && !open
        ? <SidebarTrigger className="size-7 shrink-0" aria-label="Alternar menu de navegação" aria-expanded={open} />
        : PageIcon && <PageIcon aria-hidden data-page-icon className="size-4 shrink-0 text-muted-foreground" />}
      <Breadcrumb aria-label="Breadcrumb" className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {projectMatch ? <ProjectBreadcrumb id={validProject ? projectId : 0} /> : (
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate" title={sectionName}>{sectionName}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <HeaderActionsSlot />
    </header>
  );
}
