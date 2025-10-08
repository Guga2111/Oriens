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

const queryClient = new QueryClient();

const App = () => (
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

            {/* Protected Route / Tasks */}
            <Route element={<ProtectedRoute/>}>
              <Route path="/tasks" element={<DashboardPage/>} />
            </Route>

            {/* Catch-All "*" Route */}
            <Route path="*" element={<NotFoundPage />} />

          </Routes>
        </>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
