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
    LayoutGrid, 
    Calendar, 
    Settings, 
    LifeBuoy, 
    LogOut, 
    CheckSquare, 
    Circle, 
    ChartLine,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import apiClient from "@/services/api";
import { toast } from "sonner";

// --- DADOS DE EXEMPLO (MOCK DATA) ---
// No futuro, você buscará isso da sua API

interface WeeklySummaryData {
  completedTasks: number;
  totalTasks: number;
}

const mockProjects = [
    { id: 1, name: "Desenvolvimento Oriens", color: "text-blue-500" },
    { id: 2, name: "Marketing Digital", color: "text-green-500" },
    { id: 3, name: "Estudos Pessoais", color: "text-yellow-500" },
    { id: 4, name: "Tarefas Domésticas", color: "text-red-500" },
];

// Itens de navegação (sem alterações)
const navItems = [
  { title: "Home", icon: Home, url: "/" },
  { title: "Visão Semanal", icon: LayoutGrid, url: "/tasks" },
  { title: "Estatisticas", icon: ChartLine, url: "/stats" },
];

const helpItems = [
    { title: "Ajuda & Suporte", icon: LifeBuoy, url: "/support" },
    { title: "Configurações", icon: Settings, url: "/config" },
]

export function AppSidebar() {
  const { logout, userId } = useAuth();
  const { setOpen } = useSidebar(); 
  const [isHovered, setIsHovered] = useState(false);

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData>({ completedTasks: 0, totalTasks: 0 });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setOpen(false);
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
        {/* Grupo de Navegação Principal */}
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

        {/* --- NOVA SEÇÃO DE PROJETOS --- */}
        <SidebarGroup>
            <SidebarGroupLabel>Meus Projetos (Em desenvolvimento)</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {mockProjects.map((project) => (
                        <SidebarMenuItem key={project.id}>
                            <SidebarMenuButton asChild className="justify-start">
                                <a href={`/tasks/project/${project.id}`}>
                                    <Circle className={`h-3 w-3 mr-3 ${project.color}`} fill="currentColor" />
                                    <span>{project.name}</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
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
                            {/* Item Tarefas Concluídas */}
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

                            {/* Item Produtividade */}
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

        {/* Grupo de Ajuda e Configurações */}
        <SidebarGroup className="mt-auto"> {/* Adicionado para empurrar para baixo, se necessário */}
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