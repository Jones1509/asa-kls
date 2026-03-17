import { useState, useEffect } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Menu, X, LogOut, Bell, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session, role, profile, loading, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Notification counts
  const { data: notifData } = useQuery({
    queryKey: ["notifications_count"],
    queryFn: async () => {
      const { count: unreadReports } = await supabase
        .from("field_reports")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return { unreadFieldReports: unreadReports || 0, newReports: 0 };
    },
    enabled: role === "admin",
    refetchInterval: 30000,
  });

  const totalNotifs = (notifData?.unreadFieldReports || 0) + (notifData?.newReports || 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-xl border-[3px] border-primary/15 border-t-primary" />
          </div>
          <p className="text-xs font-medium text-muted-foreground tracking-wide">Indlæser...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const userRole = role || "employee";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <AppSidebar role={userRole} profile={profile} onNavigate={() => setSidebarOpen(false)} onSignOut={signOut} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-card/60 backdrop-blur-xl px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="hidden lg:block">
              <p className="text-[13px] font-medium text-muted-foreground tabular-nums">
                {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <span className="font-heading font-bold text-foreground lg:hidden">ASA KLS</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={16} />
                {totalNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
                    {totalNotifs > 9 ? "9+" : totalNotifs}
                  </span>
                )}
              </Button>

              <AnimatePresence>
                {showNotifications && role === "admin" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-card shadow-elevated z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-heading font-bold text-card-foreground">Notifikationer</p>
                    </div>
                    <div className="divide-y divide-border max-h-64 overflow-y-auto scrollbar-subtle">
                      {(notifData?.unreadFieldReports || 0) > 0 && (
                        <Link to="/field-reports" onClick={() => setShowNotifications(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10 flex-shrink-0">
                            <Bell size={14} className="text-warning" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-card-foreground">{notifData?.unreadFieldReports} ulæste feltrapporter</p>
                            <p className="text-[10px] text-muted-foreground">Kræver din opmærksomhed</p>
                          </div>
                        </Link>
                      )}
                      {(notifData?.newReports || 0) > 0 && (
                        <Link to="/reports" onClick={() => setShowNotifications(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                            <Bell size={14} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-card-foreground">{notifData?.newReports} nye rapporter</p>
                            <p className="text-[10px] text-muted-foreground">Afventer gennemgang</p>
                          </div>
                        </Link>
                      )}
                      {totalNotifs === 0 && (
                        <div className="px-4 py-8 text-center">
                          <Bell size={20} className="text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Ingen nye notifikationer</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile link */}
            <Link to="/profile">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                <User size={16} />
              </Button>
            </Link>

            <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive lg:hidden">
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-subtle p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
