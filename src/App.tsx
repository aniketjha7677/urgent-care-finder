import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import ProtectedRoute from "@/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RoleSelectionPage from "./pages/RoleSelectionPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.tsx";
import UserDashboard from "./pages/UserDashboard.tsx";
import HospitalDashboard from "./pages/HospitalDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { loading, authError, session } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {authError}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthGate>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/:role" element={<LoginPage />} />
                <Route path="/register" element={<RoleSelectionPage />} />
                <Route path="/role-selection" element={<RoleSelectionPage />} />
                <Route path="/register/:role" element={<RegisterPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route
                  path="/dashboard/user"
                  element={
                    <ProtectedRoute allowedRoles={["user"]}>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/hospital"
                  element={
                    <ProtectedRoute allowedRoles={["hospital"]}>
                      <HospitalDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthGate>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
