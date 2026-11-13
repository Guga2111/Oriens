import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ChartLine,
  CheckSquare,
  ChevronUp,
  Circle,
  Database,
  FolderOpenDot,
  Headset,
  LifeBuoy,
  Loader2,
  LogOut,
  Moon,
  PiggyBank,
  Settings,
  Shield,
  Star,
  Sun,
  Home,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditableAvatar } from "@/components/common/EditableAvatar";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import apiClient from "@/services/api";
import { toast } from "sonner";

interface ProjectSidebarDTO {
  id: number;
  title: string;
  color?: string;
  favorite: boolean;
}

interface NavItem {
  title: string;
  icon: typeof Home;
  url: string;
  /** Match exato quando o item cobre sub-rotas (ex.: /tasks e /tasks/project/:id). */
  isActive?: (pathname: string) => boolean;
}

const planItems: NavItem[] = [
  { title: "Hoje", icon: Home, url: "/tasks", isActive: (p) => p === "/tasks" },
  {
    title: "Projetos",
    icon: FolderOpenDot,
    url: "/projects",
    isActive: (p) => p === "/projects" || p.startsWith("/tasks/project/"),
  },
  { title: "Financeiro", icon: PiggyBank, url: "/financial" },
  { title: "Estatísticas", icon: ChartLine, url: "/stats" },
  { title: "Todos os dados", icon: Database, url: "/all-data" },
];

const adminItems: NavItem[] = [
  { title: "Dashboard de Suporte", icon: Headset, url: "/admin/support" },
  { title: "Gerenciar Admins", icon: Shield, url: "/admin/management" },
];

interface AppSidebarProps {
  /** Incrementado pelo AppLayout quando um projeto é mutado (risco §16). */
  projectsVersion?: number;
}

export function AppSidebar({ projectsVersion = 0 }: AppSidebarProps) {
  const { logout, userId, role, username, userEmail, profileImageUrl, updateProfileImage } =
    useAuth();
  const { preferences, updatePreference, isUpdating } = useSettings();
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectSidebarDTO[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const isActive = (item: NavItem) =>
    item.isActive ? item.isActive(location.pathname) : location.pathname === item.url;

  // No mobile a sidebar é um Sheet: ele fecha ao navegar (SPEC §13.1 R2).
  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);

  useEffect(() => {
    const fetchSidebarProjects = async () => {      if (!userId) return;

      setIsLoadingProjects(true);
      try {
        const response = await apiClient.get<ProjectSidebarDTO[]>(
          `/project/user/${userId}/sidebar`
        );
        setProjects(response.data);
      } catch (error) {
        console.error("Erro ao buscar projetos para a sidebar:", error);
        toast.error("Não foi possível carregar seus projetos.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchSidebarProjects();
  }, [userId, projectsVersion]);

  const handleToggleFavorite = async (projectId: number) => {
    try {
      const response = await apiClient.patch<ProjectSidebarDTO>(
        `/project/${projectId}/favorite`
      );
      const updatedProject = response.data;

      setProjects((currentProjects) =>
        currentProjects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );

      toast.success(
        updatedProject.favorite ? "Projeto favoritado!" : "Projeto desfavoritado."
      );
    } catch (error) {
      console.error("Erro ao favoritar projeto na sidebar:", error);
      toast.error("Não foi possível atualizar o projeto.");
    }
  };

  const handleToggleTheme = async () => {
    if (!preferences) return;
    const newTheme = preferences.theme === "light" ? "dark" : "light";
    try {
      await updatePreference("theme", newTheme);
      toast.success(
        `Tema alterado para ${newTheme === "light" ? "claro" : "escuro"}`
      );
    } catch {
      // erro já exibido como toast pelo SettingsContext
    }
  };

  const theme = preferences?.theme || "light";
  const userFallback = (username || userEmail || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const goTo = (url: string) => {
    navigate(url);
    setOpenMobile(false);
  };

  const renderNavItem = (item: NavItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item)}
        tooltip={item.title}
        className="max-md:h-10"
      >
        <NavLink to={item.url} end={!item.isActive}>
          <item.icon />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar side="left" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <CheckSquare className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="truncate text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Oriens
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Planejar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{planItems.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoadingProjects ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-sidebar-foreground/80" />
                </div>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === `/tasks/project/${project.id}`}
                      tooltip={project.title}
                    >
                      <Link to={`/tasks/project/${project.id}`}>
                        <Circle
                          className="h-3 w-3 shrink-0"
                          style={{ color: project.color || "#ccc" }}
                          fill="currentColor"
                        />
                        <span className="truncate">{project.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      aria-label={
                        project.favorite
                          ? `Desfavoritar ${project.title}`
                          : `Favoritar ${project.title}`
                      }
                      aria-pressed={project.favorite}
                      onClick={() => handleToggleFavorite(project.id)}
                    >
                      <Star
                        className={
                          project.favorite
                            ? "fill-current text-sidebar-primary"
                            : "text-sidebar-foreground/70"
                        }
                      />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{adminItems.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={username || userEmail || "Conta"}
                  className="h-12"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profileImageUrl} alt="" />
                    <AvatarFallback>{userFallback}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{username}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="start">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <EditableAvatar
                      src={profileImageUrl || username || ""}
                      fallback={userFallback}
                      alt="Foto de perfil"
                      onImageChange={async (file: File) => {
                        const formData = new FormData();
                        formData.append("profileImage", file);
                        try {
                          const response = await apiClient.put(
                            `/user/${userId}/avatar`,
                            formData,
                            { headers: { "Content-Type": "multipart/form-data" } }
                          );
                          updateProfileImage(response.data.profileImageUrl);
                        } catch (error) {
                          console.error("Erro ao fazer upload da imagem: ", error);
                          toast.error("Não foi possivel atualizar sua imagem.");
                        }
                      }}
                    />
                    <p className="text-sm font-medium leading-none">{username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => goTo("/config")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => goTo("/support")}>
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  <span>Ajuda &amp; Suporte</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleToggleTheme} disabled={isUpdating}>
                  {theme === "light" ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}
                  <span>
                    Tema {theme === "light" ? "escuro" : "claro"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={logout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {!isMobile && <SidebarRail />}
    </Sidebar>
  );
}
