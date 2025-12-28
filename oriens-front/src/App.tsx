import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignLoginPage from "./pages/SignLoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { ProtectedRoute } from "./router/ProtectedRoute";
import ProjectsPage from "./pages/ProjectsPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import AdminSupportPage from "./pages/AdminSupportPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import { useEffect } from "react";
import FinancialPage from "./pages/FinancialPage";

const queryClient = new QueryClient();

const App = () => {

  useEffect(() => {
    document.body.style.backgroundColor = "";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<SignLoginPage />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />

              {/* Protected Route / Tasks */}
              <Route element={<ProtectedRoute />}>
                <Route path="/tasks" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/stats" element={<StatisticsPage />} />
                <Route path="/config" element={<ConfigurationPage />} />
                <Route path="/tasks/project/:id" element={<ProjectDetailPage />} />
                <Route path="/financial" element={<FinancialPage />} />
                <Route path="/support" element={<HelpSupportPage />} />
                <Route path="/admin/support" element={<AdminSupportPage />} />
                <Route path="/admin/management" element={<AdminManagementPage />} />
              </Route>

              {/* Catch-All "*" Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
