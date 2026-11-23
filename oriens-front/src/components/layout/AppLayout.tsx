import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppHeader } from "@/components/common/AppHeader";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { AppContextRail } from "./AppContextRail";

/**
 * Com a layout route (SPEC §10.2) o AppSidebar deixa de remontar a cada troca
 * de rota, então o fetch de projetos também deixa de rodar sozinho. Este
 * contexto expõe um refresh para ser chamado após favoritar, criar, arquivar
 * ou excluir um projeto (risco §16).
 */
type SidebarProjectsContextValue = {
  refreshSidebarProjects: () => void;
};

const SidebarProjectsContext = createContext<SidebarProjectsContextValue>({
  refreshSidebarProjects: () => {},
});

export function useSidebarProjects() {
  return useContext(SidebarProjectsContext);
}

export function AppLayout() {
  const [projectsVersion, setProjectsVersion] = useState(0);

  const refreshSidebarProjects = useCallback(() => {
    setProjectsVersion((version) => version + 1);
  }, []);

  const contextValue = useMemo(
    () => ({ refreshSidebarProjects }),
    [refreshSidebarProjects]
  );

  return (
    <SidebarProjectsContext.Provider value={contextValue}>
      <SidebarProvider className="h-svh min-h-0 flex-col bg-background">
        <AppShell projectsVersion={projectsVersion} />
      </SidebarProvider>
    </SidebarProjectsContext.Provider>
  );
}

function AppShell({ projectsVersion }: { projectsVersion: number }) {
  const { isMobile, open, openMobile, setOpenMobile } = useSidebar();
  const { pathname, search } = useLocation();
  const [taskOpen, setTaskOpen] = useState(false);

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, search, isMobile, setOpenMobile]);

  const createTask = () => {
    setOpenMobile(false);
    setTaskOpen(true);
  };

  return (
    <>
      <AppTopBar />
      <div className="flex min-h-0 flex-1">
        {!isMobile && <AppContextRail />}
        <div data-app-panel className="flex min-w-0 flex-1 overflow-hidden bg-card desktop:mb-2 desktop:mr-2 desktop:rounded-lg desktop:border">
          {!isMobile && open && <AppSidebar projectsVersion={projectsVersion} onNewTask={createTask} />}
          <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">
            <AppHeader />
            <div data-page-content className="min-h-0 min-w-0 flex-1 overflow-y-auto px-page py-4 md:py-5">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {isMobile && (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent id="app-navigation-mobile" side="left" aria-describedby={undefined} className="flex w-mobile-navigation max-w-full gap-0 p-0 sm:max-w-none [&>button]:hidden">
            <SheetTitle className="sr-only">Navegação Oriens</SheetTitle>
            <AppContextRail />
            <AppSidebar projectsVersion={projectsVersion} onNewTask={createTask} />
          </SheetContent>
        </Sheet>
      )}
      <TaskEditor open={taskOpen} onOpenChange={setTaskOpen} />
    </>
  );
}
