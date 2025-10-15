import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Loader2, CheckCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  linkTo?: string;
  createdAt: string;
}

export function NotificationBell() {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const response = await apiClient.get(`/notifications/user/${userId}/last-notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error("Falha ao buscar notificações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const handleMarkAsRead = async (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    try {
      await apiClient.post(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error("Falha ao marcar notificação como lida:", error);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
    }
  };

const handleMarkAllAsRead = async () => {
    if (!userId) return;

    const originalNotifications = [...notifications]; 
    setIsMarkingAll(true);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      const response = await apiClient.patch(`/notifications/user/${userId}/read-all`);
      const { updatedCount } = response.data;
      
      if (updatedCount > 0) {
        toast.success(`${updatedCount} notificações marcadas como lidas.`);
      } else {
        toast.info("Nenhuma notificação nova para marcar.");
      }
      fetchNotifications();
    } catch (error) {
      console.error("Falha ao marcar as notificações como lidas: ", error);
      toast.error("Ocorreu um erro. Tente novamente.");
      setNotifications(originalNotifications); 
    } finally {
      setIsMarkingAll(false);
    }
  }

  const handleClearAll = async () => {
    if (!userId) return;

    if (!window.confirm("Tem certeza que deseja remover todas as notificações? Esta ação não pode ser desfeita.")) {
      return;
    }

    const originalNotifications = [...notifications];
    setIsClearingAll(true);

    setNotifications([]);

    try {
      const response = await apiClient.delete(`/notifications/user/${userId}`);
      const { deletedCount } = response.data;
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} notificações foram removidas.`);
      } else {
        toast.info("Não havia notificações para remover.");
      }
    } catch (error) {
      console.error("Falha ao remover as notificações:", error);
      toast.error("Ocorreu um erro ao remover as notificações.");
      setNotifications(originalNotifications); 
    } finally {
      setIsClearingAll(false);
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(notification => (
            <DropdownMenuItem 
              key={notification.id} 
              className="flex flex-col items-start gap-1 whitespace-normal"
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <div className="flex items-center w-full">
                {!notification.read && <span className="h-2 w-2 rounded-full bg-primary mr-3" />}
                <p className={cn("text-sm", !notification.read && "font-semibold")}>
                  {notification.message}
                </p>
              </div>
              <p className={cn("text-xs text-muted-foreground", !notification.read && "pl-5")}>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação nova.</p>
        )}

         {notifications.length > 0 && !isLoading && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex flex-col gap-2">
              <Button 
                className="w-full" 
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={!hasUnread || isMarkingAll || isClearingAll}
              >
                {isMarkingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                Marcar todas como lidas
              </Button>
              <Button 
                variant="destructive"
                className="w-full" 
                size="sm"
                onClick={handleClearAll}
                disabled={isClearingAll || isMarkingAll}
              >
                {isClearingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Limpar todas
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}