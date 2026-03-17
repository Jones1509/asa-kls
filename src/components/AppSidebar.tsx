import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Clock,
  ClipboardCheck,
  FolderOpen,
  MessageSquare,
  Users,
  LogOut,
  Receipt,
  Radio,
  Building2,
  AlertOctagon,
  Contact,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AppSidebarProps {
  role: "admin" | "employee";
  profile?: { full_name: string; email: string } | null;
  onNavigate?: () => void;
  onSignOut?: () => void;
}

const adminLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", section: "Oversigt" },
  { to: "/invoices", icon: Receipt, label: "Fakturaer", section: "Økonomi" },
  { to: "/cases", icon: Briefcase, label: "Sager", section: "Planlægning" },
  { to: "/schedule", icon: Calendar, label: "Kalender", section: "Planlægning" },
  { to: "/time-tracking", icon: Clock, label: "Timeregistrering", section: "Planlægning" },
  { to: "/chat", icon: MessageSquare, label: "Chat", section: "Kommunikation" },
  { to: "/company", icon: Building2, label: "KLS Dokumentation", section: "KLS & Kvalitet" },
  { to: "/verification", icon: ClipboardCheck, label: "Verifikationsskemaer", section: "KLS & Kvalitet" },
  { to: "/field-reports", icon: Radio, label: "Feltrapporter", section: "KLS & Kvalitet" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation", section: "KLS & Kvalitet" },
  { to: "/deviations", icon: AlertOctagon, label: "Afvigelser", section: "KLS & Kvalitet" },
  { to: "/employees", icon: Users, label: "Medarbejdere", section: "KLS & Kvalitet" },
];

const employeeLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", section: "Oversigt" },
  { to: "/cases", icon: Briefcase, label: "Mine sager", section: "Oversigt" },
  { to: "/schedule", icon: Calendar, label: "Min plan", section: "Planlægning" },
  { to: "/time-tracking", icon: Clock, label: "Timer", section: "Planlægning" },
  { to: "/chat", icon: MessageSquare, label: "Chat", section: "Kommunikation" },
  { to: "/verification", icon: ClipboardCheck, label: "Verifikationsskemaer", section: "KLS & Kvalitet" },
  { to: "/field-reports", icon: Radio, label: "Feltrapporter", section: "KLS & Kvalitet" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation", section: "KLS & Kvalitet" },
  { to: "/deviations", icon: AlertOctagon, label: "Afvigelser", section: "KLS & Kvalitet" },
];

export function AppSidebar({ role, profile, onNavigate, onSignOut }: AppSidebarProps) {
  const links = role === "admin" ? adminLinks : employeeLinks;
  const location = useLocation();

  const sections = links.reduce((acc, link) => {
    if (!acc[link.section]) acc[link.section] = [];
    acc[link.section].push(link);
    return acc;
  }, {} as Record<string, typeof links>);

  return (
    <aside className="flex h-full w-[264px] flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-6 flex-shrink-0 border-b border-sidebar-border/50">
        <div>
          <span className="font-heading text-xl font-extrabold italic tracking-tight text-sidebar-primary">ASA</span>
          <p className="text-[8px] font-semibold text-sidebar-primary/50 tracking-[0.2em] uppercase leading-none mt-0.5">Kvalitetsledelsessystem</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-4 scrollbar-thin">
        {Object.entries(sections).map(([section, sectionLinks]) => (
          <div key={section} className="mb-5">
            <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/25">{section}</p>
            <div className="space-y-0.5">
              {sectionLinks.map((link) => {
                const isActive = link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-sidebar-primary/12 text-sidebar-primary"
                        : "text-sidebar-foreground/55 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 inset-y-0 my-auto h-5 w-[3px] rounded-full bg-sidebar-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <link.icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile - fixed at bottom */}
      <div className="border-t border-sidebar-border/50 px-3 py-3 flex-shrink-0">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
            isActive ? "bg-sidebar-primary/12" : "hover:bg-sidebar-accent/80"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-[11px] font-bold text-white shadow-[0_2px_8px_hsl(215_80%_56%/0.2)] flex-shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() || (role === "admin" ? "A" : "M")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-sidebar-accent-foreground truncate">
              {profile?.full_name || (role === "admin" ? "Administrator" : "Medarbejder")}
            </p>
            <p className="text-[10px] text-sidebar-foreground/35 truncate">
              {role === "admin" ? "Administrator" : "Medarbejder"}
            </p>
          </div>
          {onSignOut && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSignOut(); }} className="rounded-lg p-1.5 text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-destructive transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
