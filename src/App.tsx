import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
