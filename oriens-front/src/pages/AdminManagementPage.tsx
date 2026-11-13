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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { KpiStrip, type KpiStripItem } from "@/components/statistics/KpiStrip";
import { Users } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { USER_ROLE } from "@/lib/labels";

interface User {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export default function AdminManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/user/admin/all-users");
      setUsers(response.data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar lista de usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const response = await apiClient.patch(
        `/user/admin/${userId}/role/${newRole}`
      );
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: response.data.role } : user
        )
      );
      toast.success("Permissão atualizada");
      setSelectedRole("");
      setSelectedUserId(null);
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      toast.error("Erro ao atualizar permissão do usuário");
    }
  };

  const renderRoleAction = (user: User) => (
<Dialog open={selectedUserId === user.id} onOpenChange={(open) => { if (!open) { setSelectedUserId(null); setSelectedRole(""); } }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setSelectedRole(user.role);
                                  }}
                                >
                                  Alterar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Alterar permissão</DialogTitle>
                                  <DialogDescription>
                                    Usuário: {user.name} ({user.email})
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-4 py-4">
                                  <div className="flex flex-col gap-2">
                                    <label
                                      htmlFor="user-role"
                                      className="text-sm font-medium"
                                    >
                                      Nova permissão
                                    </label>
                                    <Select
                                      value={selectedRole}
                                      onValueChange={setSelectedRole}
                                    >
                                      <SelectTrigger id="user-role">
                                        <SelectValue placeholder="Selecione uma permissão" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="USER">
                                          Usuário
                                        </SelectItem>
                                        <SelectItem value="ADMIN">
                                          Administrador
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedRole("");
                                        setSelectedUserId(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (selectedUserId && selectedRole) {
                                          handleUpdateRole(
                                            selectedUserId,
                                            selectedRole
                                          );
                                        }
                                      }}
                                    >
                                      Confirmar
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
  );

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const userCount = users.filter((u) => u.role === "USER").length;

  const kpis: KpiStripItem[] = [
    {
      label: "Total de usuários",
      value: String(users.length),
      goodDirection: "up",
      description: "Contas registradas",
    },
    {
      label: "Usuários",
      value: String(userCount),
      goodDirection: "up",
      description: "Com acesso padrão",
    },
    {
      label: "Administradores",
      value: String(adminCount),
      goodDirection: "up",
      description: "Com acesso completo",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex max-w-[1280px] flex-col gap-6">
        <PageHeader
          title="Gerenciar permissões"
          description="Gerencie as permissões e papéis dos usuários"
        />

        <Separator />

        <KpiStrip items={kpis} isLoading={isLoading && users.length === 0} />

        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              Selecione um usuário para alterar suas permissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div
                className="py-8 text-center text-muted-foreground"
                aria-busy="true"
              >
                Carregando usuários...
              </div>
            ) : users.length > 0 ? isMobile ? (
              <ul aria-label="Lista de usuários" className="divide-y rounded-lg border">
                {users.map((user) => (
                  <li key={user.id} className="flex min-w-0 flex-col gap-2 p-3">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{user.name}</span>
                      <Badge variant={USER_ROLE[user.role].badge}>{USER_ROLE[user.role].label}</Badge>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground" title={user.email}>{user.email}</span>
                      {renderRoleAction(user)}
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
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead className="text-right">Data de criação</TableHead>
                      <TableHead className="w-[140px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {user.id}
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              USER_ROLE[
                                user.role as keyof typeof USER_ROLE
                              ].badge
                            }
                          >
                            {USER_ROLE[user.role as keyof typeof USER_ROLE].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            {renderRoleAction(user)}
                          </div>
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
                    Nenhum usuário encontrado
                  </EmptyTitle>
                  <EmptyDescription>
                    As contas registradas aparecem aqui.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
