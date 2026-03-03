import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/stores/auth-store";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import QREntryPage from "./pages/QREntryPage";
import Unauthorized from "./pages/Unauthorized";
import WorkshopViewer from "./pages/WorkshopViewer";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import UtilizationForm from "./pages/UtilizationForm";
import PracticalModule from "./pages/PracticalModule";
import NotFound from "./pages/NotFound";
import { useRealtimeInvalidation } from "./hooks/use-realtime";

const queryClient = new QueryClient();

/** Wrapper that activates the global realtime → query-cache bridge */
function RealtimeBridge({ children }: { children: React.ReactNode }) {
  useRealtimeInvalidation();
  return <>{children}</>;
}

/** Redirects /dashboard to the correct role-specific dashboard */
function DashboardRouter() {
  const { profile } = useAuthStore();
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'faculty') return <Navigate to="/faculty" replace />;
  return <StudentDashboard />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RealtimeBridge>
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/enter" element={<QREntryPage />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route
              path="/workshop"
              element={
                <ProtectedRoute>
                  <WorkshopViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/utilize/:machine_id?"
              element={
                <ProtectedRoute>
                  <UtilizationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practical"
              element={
                <ProtectedRoute>
                  <PracticalModule />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
          </RealtimeBridge>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
