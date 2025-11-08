import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/dashboard/AppSidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/common/AppHeader"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/services/api"

interface SupportTicket {
  id: number
  subject: string
  message: string
  userEmail: string
  userId: number
  status: "OPEN" | "IN_PROGRESS" | "CLOSED"
  priority: "LOW" | "MEDIUM" | "HIGH"
  createdAt: string
  updatedAt: string
}

interface DashboardStats {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  closedTickets: number
  averageResolutionTime: number
}

export default function AdminSupportPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    filterTickets(selectedStatus)
  }, [allTickets, selectedStatus])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const [statsResponse, ticketsResponse] = await Promise.all([
        apiClient.get("/support/admin/stats"),
        apiClient.get("/support/admin/tickets"),
      ])

      setStats(statsResponse.data)
      setAllTickets(ticketsResponse.data)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados do dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  const filterTickets = (status: string) => {
    setSelectedStatus(status)
    if (status === "ALL") {
      setFilteredTickets(allTickets)
    } else {
      setFilteredTickets(allTickets.filter(t => t.status === status))
    }
  }

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      await apiClient.patch(`/support/ticket/${ticketId}/status`, null, {
        params: { status: newStatus }
      })
      toast.success("Status atualizado com sucesso")
      fetchDashboardData()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast.error("Erro ao atualizar status")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="destructive">Aberto</Badge>
      case "IN_PROGRESS":
        return <Badge variant="secondary">Em Progresso</Badge>
      case "CLOSED":
        return <Badge variant="default">Fechado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <Badge variant="destructive">Alta</Badge>
      case "MEDIUM":
        return <Badge variant="secondary">Média</Badge>
      case "LOW":
        return <Badge variant="outline">Baixa</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
            )}
            {Math.abs(trend)}% vs semana passada
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <AppHeader />
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="max-w-7xl w-full mx-auto p-8 space-y-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard de Suporte</h1>
                <p className="text-muted-foreground">
                  Gerencie e acompanhe todos os tickets de suporte dos usuários
                </p>
              </div>

              <Separator />

              {/* Stats Grid */}
              {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <StatCard
                    icon={MessageSquare}
                    label="Total de Tickets"
                    value={stats.totalTickets}
                  />
                  <StatCard
                    icon={AlertCircle}
                    label="Abertos"
                    value={stats.openTickets}
                    trend={12}
                  />
                  <StatCard
                    icon={Clock}
                    label="Em Progresso"
                    value={stats.inProgressTickets}
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="Fechados"
                    value={stats.closedTickets}
                    trend={-8}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Tempo Médio (h)"
                    value={stats.averageResolutionTime.toFixed(1)}
                  />
                </div>
              )}

              {/* Tickets Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Tickets de Suporte</CardTitle>
                  <CardDescription>
                    Todos os tickets submetidos pelos usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="ALL" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                      <TabsTrigger
                        value="ALL"
                        onClick={() => filterTickets("ALL")}
                      >
                        Todos
                      </TabsTrigger>
                      <TabsTrigger
                        value="OPEN"
                        onClick={() => filterTickets("OPEN")}
                      >
                        Abertos
                      </TabsTrigger>
                      <TabsTrigger
                        value="IN_PROGRESS"
                        onClick={() => filterTickets("IN_PROGRESS")}
                      >
                        Em Progresso
                      </TabsTrigger>
                      <TabsTrigger
                        value="CLOSED"
                        onClick={() => filterTickets("CLOSED")}
                      >
                        Fechados
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value={selectedStatus}>
                      {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Carregando tickets...
                        </div>
                      ) : filteredTickets.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Assunto</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Prioridade</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTickets.map((ticket) => (
                                <TableRow key={ticket.id}>
                                  <TableCell className="font-medium">
                                    #{ticket.id}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {ticket.subject}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {ticket.userEmail}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(ticket.status)}
                                  </TableCell>
                                  <TableCell>
                                    {getPriorityBadge(ticket.priority)}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      {ticket.status !== "CLOSED" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleUpdateStatus(
                                              ticket.id,
                                              ticket.status === "OPEN"
                                                ? "IN_PROGRESS"
                                                : "CLOSED"
                                            )
                                          }
                                        >
                                          {ticket.status === "OPEN"
                                            ? "Iniciar"
                                            : "Fechar"}
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          window.location.href = `mailto:${ticket.userEmail}?subject=Re: ${ticket.subject}`
                                        }}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum ticket encontrado</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
