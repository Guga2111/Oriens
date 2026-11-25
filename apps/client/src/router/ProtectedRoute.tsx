import { Navigate, Outlet, useLocation } from "react-router-dom";
import { mcpFlow } from '@/lib/mcp';
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute () {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

    if (isAuthenticated) {
        return <Outlet />
    }

    const flow = location.pathname === '/config' ? mcpFlow(location.search) : null;
    return <Navigate to={flow ? `/auth?mcpFlow=${flow}` : '/auth'} replace />
}
