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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Shield,
  Users,
  User,
} from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/services/api"

interface User {
  id: number
  name: string
  email: string
  role: "USER" | "ADMIN"
  createdAt: string
}

export default function AdminManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  useEffect(() => {
    fetchAllUsers()
  }, [])

  const fetchAllUsers = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get("/user/admin/all-users")
      setUsers(response.data)
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
      toast.error("Erro ao carregar lista de usuários")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const response = await apiClient.patch(
        `/user/admin/${userId}/role/${newRole}`
      )
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: response.data.role } : user
        )
      )
      toast.success(`Permissão atualizada para ${newRole}`)
      setSelectedRole("")
      setSelectedUserId(null)
    } catch (error) {
      console.error("Erro ao atualizar role:", error)
      toast.error("Erro ao atualizar permissão do usuário")
    }
  }

  const getRoleBadge = (role: string) => {
    return role === "ADMIN" ? (
      <Badge className="bg-gradient-primary text-white h-6 inline-flex items-center gap-1">
        <Shield className="h-3 w-3 flex-shrink-0" />
        Admin
      </Badge>
    ) : (
      <Badge variant="secondary" className="h-6 inline-flex items-center gap-1">
        <User className="h-3 w-3 flex-shrink-0" />
        Usuário
      </Badge>
    )
  }

  const adminCount = users.filter((u) => u.role === "ADMIN").length
  const userCount = users.filter((u) => u.role === "USER").length

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <AppHeader />
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="max-w-7xl w-full mx-auto p-8 space-y-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Admins</h1>
                <p className="text-muted-foreground">
                  Gerencie as permissões e roles dos usuários
                </p>
              </div>

              <Separator />

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total de Usuários
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Usuários Normais
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Administradores
                    </CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminCount}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Users Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>
                    Clique em um usuário para alterar suas permissões
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando usuários...
                    </div>
                  ) : users.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Permissão</TableHead>
                            <TableHead>Data de Criação</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.id}
                              </TableCell>
                              <TableCell>{user.name}</TableCell>
                              <TableCell className="text-sm">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                {getRoleBadge(user.role)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(user.createdAt).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedUserId(user.id)
                                        setSelectedRole(user.role)
                                      }}
                                    >
                                      Alterar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Alterar Permissão
                                      </DialogTitle>
                                      <DialogDescription>
                                        Usuário: {user.name} ({user.email})
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                          Nova Permissão
                                        </label>
                                        <Select
                                          value={selectedRole}
                                          onValueChange={setSelectedRole}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma permissão" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="USER">
                                              Usuário Normal
                                            </SelectItem>
                                            <SelectItem value="ADMIN">
                                              Administrador
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="flex gap-2 justify-end">
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedRole("")
                                            setSelectedUserId(null)
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
                                              )
                                            }
                                          }}
                                        >
                                          Confirmar
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum usuário encontrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
