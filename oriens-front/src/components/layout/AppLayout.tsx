import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/common/AppHeader";
import { AppSidebar } from "./AppSidebar";

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
      <SidebarProvider>
        <AppSidebar projectsVersion={projectsVersion} />
        <SidebarInset>
          <AppHeader />
          {/* Loading e erro das páginas acontecem dentro deste Outlet,
              nunca substituindo o shell (SPEC §10.2). */}
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarProjectsContext.Provider>
  );
}
