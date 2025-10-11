import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const response = await apiClient.get(`/notifications/user/${userId}`);
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}