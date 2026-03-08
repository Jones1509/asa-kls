import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Menu, X, LogOut, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session, role, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-xl border-[3px] border-primary/20 border-t-primary" />
          <p className="text-xs font-medium text-muted-foreground">Indlæser...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const userRole = role || "employee";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <AppSidebar role={userRole} profile={profile} onSignOut={signOut} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <AppSidebar role={userRole} profile={profile} onNavigate={() => setSidebarOpen(false)} onSignOut={signOut} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-xl px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-muted-foreground">
                {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <span className="font-heading font-bold text-foreground lg:hidden">ASA KLS</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              <Bell size={17} />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive lg:hidden">
              <LogOut size={17} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
