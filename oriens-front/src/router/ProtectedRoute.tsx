import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute () {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

    if (isAuthenticated) {
        return <Outlet />
    }

    return <Navigate to={'/auth'} replace />
}