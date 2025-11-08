import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Settings,
  LifeBuoy,
  LogOut,
  CheckSquare,
  Circle,
  ChartLine,
  Loader2,
  FolderOpenDot,
  Star,
  Shield,
  Headset
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import apiClient from "@/services/api";
import { toast } from "sonner";

interface ProjectSidebarDTO {
  id: number;
  title: string;
  color?: string;
  favorite: boolean;
}

interface WeeklySummaryData {
  completedTasks: number;
  totalTasks: number;
}

const navItems = [
  { title: "Home", icon: Home, url: "/tasks" },
  { title: "Estatisticas", icon: ChartLine, url: "/stats" },
  { title: "Projetos", icon: FolderOpenDot, url: "/projects" },

];

const helpItems = [
  { title: "Ajuda & Suporte", icon: LifeBuoy, url: "/support" },
  { title: "Configurações", icon: Settings, url: "/config" },
]

const adminItems = [
  { title: "Dashboard de Suporte", icon: Headset, url: "/admin/support" },
  { title: "Gerenciar Admins", icon: Shield, url: "/admin/management" },
]

export function AppSidebar() {
  const { logout, userId, role } = useAuth();
  const { setOpen } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  const isInitialMount = useRef(true);

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData>({ completedTasks: 0, totalTasks: 0 });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const [projects, setProjects] = useState<ProjectSidebarDTO[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {

    if (isInitialMount.current) {
      setOpen(false);
      isInitialMount.current = false;
    }
  }, [setOpen]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setOpen(false);
  };

  const handleToggleFavorite = async (projectId: number) => {
    try {
      const response = await apiClient.patch<ProjectSidebarDTO>(`/project/${projectId}/favorite`);
      const updatedProject = response.data;

      setProjects(currentProjects =>
        currentProjects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        )
      );

      toast.success(updatedProject.favorite ? "Projeto favoritado!" : "Projeto desfavoritado.");

    } catch (error) {
      console.error("Erro ao favoritar projeto na sidebar:", error);
      toast.error("Não foi possível atualizar o projeto.");
    }
  };

  useEffect(() => {
    const fetchWeeklySummary = async () => {
      if (!userId) return;

      setIsLoadingSummary(true);
      try {
        const response = await apiClient.get<WeeklySummaryData>(`/task/user/${userId}/summary/weekly-counts`);
        setWeeklySummary(response.data);
      } catch (error) {
        console.error("Falha ao buscar o resumo semanal:", error);

      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchWeeklySummary();
  }, [userId]);

  useEffect(() => {
    const fetchSidebarProjects = async () => {
      if (!userId) return;

      setIsLoadingProjects(true);
      try {
        const response = await apiClient.get<ProjectSidebarDTO[]>(`/project/user/${userId}/sidebar`);
        setProjects(response.data);
      } catch (error) {
        console.error("Erro ao buscar projetos para a sidebar:", error);
        toast.error("Não foi possível carregar seus projetos.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchSidebarProjects();
  }, [userId]);

  const productivity = weeklySummary.totalTasks > 0
    ? (weeklySummary.completedTasks / weeklySummary.totalTasks) * 100
    : 0;

  return (
    <Sidebar
      side="left"
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader>
        {isHovered ? (
          <div className="flex items-center gap-2 p-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
              Oriens
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">

        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Meus Projetos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoadingProjects ? (
                <div className="flex justify-center items-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild className="justify-start group">
                      <a href={`/tasks/project/${project.id}`} className="flex items-center w-full">
                        <Circle
                          className="h-3 w-3 mr-3 flex-shrink-0"
                          style={{ color: project.color || "#ccc" }}
                          fill="currentColor"
                        />
                        <span className="truncate flex-1">{project.title}</span>
                        <button
                          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            handleToggleFavorite(project.id);
                          }}
                        >
                          <Star
                            className={`h-4 w-4 flex-shrink-0 ${project.favorite
                                ? 'text-yellow-400 fill-current'
                                : 'text-muted-foreground hover:text-yellow-400'
                              }`}
                          />
                        </button>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isHovered && (
          <SidebarGroup>
            <SidebarGroupLabel>Resumo Semanal</SidebarGroupLabel>
            <SidebarGroupContent>
              {isLoadingSummary ? (
                <div className="flex justify-center items-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4 text-sm p-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Tarefas concluídas</span>
                      <span className="font-bold text-foreground">{weeklySummary.completedTasks}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-gradient-primary"
                        style={{ width: `${productivity}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Produtividade</span>
                      <span className="font-bold text-foreground">{Math.round(productivity)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-gradient-primary"
                        style={{ width: `${productivity}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "ADMIN" && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Ajuda</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}