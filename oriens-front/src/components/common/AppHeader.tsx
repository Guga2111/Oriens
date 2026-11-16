import { Link, useLocation, useMatch } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useWorkProject } from "@/hooks/useWork";

const sectionNames: Record<string, string> = {
  "/tasks": "Hoje",
  "/projects": "Projetos",
  "/stats": "Estatísticas",
  "/config": "Configurações",
  "/financial": "Financeiro",
  "/all-data": "Todos os dados",
  "/support": "Ajuda & Suporte",
  "/admin/support": "Dashboard de Suporte",
  "/admin/management": "Gerenciar Admins",
};

function ProjectBreadcrumb({ id }: { id: number }) {
  // The page uses this same query key: names follow edits without mirrored state.
  const { data: project, isPending } = useWorkProject(id);
  const title = project?.title ?? (id > 0 && isPending ? "Carregando projeto…" : "Projeto indisponível");

  return (
    <>
      <BreadcrumbItem className="shrink-0">
        <BreadcrumbLink asChild>
          <Link to="/projects" className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Projetos
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator className="shrink-0" />
      <BreadcrumbItem className="min-w-0">
        <BreadcrumbPage className="truncate" title={title}>{title}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

/**
 * Navegação de contexto do shell. Compartilha a altura com o topo da sidebar;
 * o único h1, os metadados e as ações da rota continuam no PageHeader.
 */
export function AppHeader() {
  const { pathname } = useLocation();
  const projectMatch = useMatch("/tasks/project/:id");
  const projectId = Number(projectMatch?.params.id);
  const validProject = Number.isSafeInteger(projectId) && projectId > 0;
  const sectionName = sectionNames[pathname.replace(/\/$/, "")] ?? "Oriens";

  return (
    <header className="sticky top-0 z-10 flex h-[--app-header-height] shrink-0 items-center gap-2 border-b border-sidebar-border bg-background px-4">
      <SidebarTrigger className="size-11 shrink-0" aria-label="Alternar menu de navegação" />
      <Breadcrumb aria-label="Breadcrumb" className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {projectMatch ? <ProjectBreadcrumb id={validProject ? projectId : 0} /> : (
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate" title={sectionName}>{sectionName}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <NotificationBell />
    </header>
  );
}
