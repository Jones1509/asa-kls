import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppLayout } from "./components/AppLayout";
import AdminDashboard from "./pages/AdminDashboard";
import CasesPage from "./pages/CasesPage";
import SchedulePage from "./pages/SchedulePage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import ReportsPage from "./pages/ReportsPage";
import VerificationPage from "./pages/VerificationPage";
import DocumentationPage from "./pages/DocumentationPage";
import EmployeesPage from "./pages/EmployeesPage";
import ChatPage from "./pages/ChatPage";
import InvoicesPage from "./pages/InvoicesPage";
import FieldReportsPage from "./pages/FieldReportsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import CompanyPage from "./pages/CompanyPage";
import DeviationsPage from "./pages/DeviationsPage";

const queryClient = new QueryClient();

function AdminRoute({ element }: { element: React.ReactElement }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/" replace />;
  return element;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/invoices" element={<AdminRoute element={<InvoicesPage />} />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/time-tracking" element={<TimeTrackingPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/documentation" element={<DocumentationPage />} />
              <Route path="/deviations" element={<DeviationsPage />} />
              <Route path="/employees" element={<AdminRoute element={<EmployeesPage />} />} />
              <Route path="/company" element={<AdminRoute element={<CompanyPage />} />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/field-reports" element={<FieldReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
