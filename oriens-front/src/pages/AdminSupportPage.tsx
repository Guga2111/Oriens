import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { KpiStrip, type KpiStripItem } from "@/components/statistics/KpiStrip";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { PRIORITY, SUPPORT_STATUS } from "@/lib/labels";

interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  userEmail: string;
  userId: number;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  closedTickets: number;
  averageResolutionTime: number;
}

export default function AdminSupportPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    filterTickets(selectedStatus);
  }, [allTickets, selectedStatus]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsResponse, ticketsResponse] = await Promise.all([
        apiClient.get("/support/admin/stats"),
        apiClient.get("/support/admin/tickets"),
      ]);

      setStats(statsResponse.data);
      setAllTickets(ticketsResponse.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = (status: string) => {
    setSelectedStatus(status);
    if (status === "ALL") {
      setFilteredTickets(allTickets);
    } else {
      setFilteredTickets(allTickets.filter((t) => t.status === status));
    }
  };

  const handleUpdateStatus = async (
    ticketId: number,
    newStatus: string
  ) => {
    try {
      await apiClient.patch(`/support/ticket/${ticketId}/status`, null, {
        params: { status: newStatus },
      });
      toast.success("Status atualizado com sucesso");
      fetchDashboardData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const renderTicketActions = (ticket: SupportTicket) => (
<div className="flex justify-end gap-2">
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
                                <Button asChild variant="ghost" size="icon">
                                  <a
                                    href={`mailto:${ticket.userEmail}?subject=${encodeURIComponent(
                                      `Re: ${ticket.subject}`
                                    )}`}
                                    aria-label={`Responder por e-mail para ${ticket.userEmail}`}
                                  >
                                    <Mail className="h-4 w-4" aria-hidden />
                                  </a>
                                </Button>
                              </div>
  );

  const kpis: KpiStripItem[] = stats
    ? [
        {
          label: "Total de tickets",
          value: String(stats.totalTickets),
          goodDirection: "down",
          description: "Tickets registrados",
        },
        {
          label: "Abertos",
          value: String(stats.openTickets),
          goodDirection: "down",
          description: "Aguardando resposta",
        },
        {
          label: "Em andamento",
          value: String(stats.inProgressTickets),
          goodDirection: "down",
          description: "Em resolução",
        },
        {
          label: "Fechados",
          value: String(stats.closedTickets),
          goodDirection: "up",
          description: "Resolvidos",
        },
      ]
    : [];

  return (
    <div className="p-6 md:p-8">
      <div className="flex max-w-[1280px] flex-col gap-6">
        <PageHeader
          title="Suporte"
          description="Gerencie e acompanhe os tickets de suporte dos usuários"
        />

        <Separator />

        {stats && (
          <div className="flex flex-col gap-2">
            <KpiStrip items={kpis} />
            <p className="text-sm text-muted-foreground">
              Tempo médio de resolução:{" "}
              {stats.averageResolutionTime.toFixed(1)} h
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tickets de suporte</CardTitle>
            <CardDescription>
              Todos os tickets submetidos pelos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ALL" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="ALL" onClick={() => filterTickets("ALL")}>
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
                  Em andamento
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
                  <div
                    className="py-8 text-center text-muted-foreground"
                    aria-busy="true"
                  >
                    Carregando tickets...
                  </div>
                ) : filteredTickets.length > 0 ? isMobile ? (
                  <ul aria-label="Lista de tickets" className="divide-y rounded-lg border">
                    {filteredTickets.map((ticket) => (
                      <li key={ticket.id} className="flex min-w-0 flex-col gap-2 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-medium" title={ticket.subject}>{ticket.subject}</span>
                          <Badge variant={SUPPORT_STATUS[ticket.status].badge}>{SUPPORT_STATUS[ticket.status].label}</Badge>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-muted-foreground" title={ticket.userEmail}>{ticket.userEmail}</span>
                          {renderTicketActions(ticket)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead className="text-right">Data</TableHead>
                          <TableHead className="w-[140px] text-right">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="tabular-nums text-muted-foreground">
                              #{ticket.id}
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-medium">
                              {ticket.subject}
                            </TableCell>
                            <TableCell className="text-sm">
                              {ticket.userEmail}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  SUPPORT_STATUS[
                                    ticket.status as keyof typeof SUPPORT_STATUS
                                  ].badge
                                }
                              >
                                {
                                  SUPPORT_STATUS[
                                    ticket.status as keyof typeof SUPPORT_STATUS
                                  ].label
                                }
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  PRIORITY[
                                    ticket.priority as keyof typeof PRIORITY
                                  ].badge
                                }
                              >
                                {
                                  PRIORITY[
                                    ticket.priority as keyof typeof PRIORITY
                                  ].label
                                }
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                              {new Date(ticket.createdAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </TableCell>
                            <TableCell>
                              {renderTicketActions(ticket)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Empty className="border-0 p-0">
                    <EmptyHeader>
                      <EmptyTitle className="text-base">
                        Nenhum ticket encontrado
                      </EmptyTitle>
                      <EmptyDescription>
                        Os tickets enviados pelos usuários aparecem aqui.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
