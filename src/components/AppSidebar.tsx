import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  ClipboardCheck,
  FolderOpen,
  MessageSquare,
  Users,
  LogOut,
  Receipt,
  Radio,
  User,
  Settings,
  Building2,
  AlertOctagon,
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
  { to: "/cases", icon: Briefcase, label: "Sager", section: "Oversigt" },
  { to: "/invoices", icon: Receipt, label: "Fakturaer", section: "Oversigt" },
  { to: "/schedule", icon: Calendar, label: "Kalender", section: "Planlægning" },
  { to: "/time-tracking", icon: Clock, label: "Timeregistrering", section: "Planlægning" },
  { to: "/reports", icon: FileText, label: "Rapporter", section: "KLS Dokumenter" },
  { to: "/verification", icon: ClipboardCheck, label: "Kontrolskemaer", section: "KLS Dokumenter" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation", section: "KLS Dokumenter" },
  { to: "/deviations", icon: AlertOctagon, label: "Afvigelser", section: "KLS Dokumenter" },
  { to: "/field-reports", icon: Radio, label: "Feltrapporter", section: "Kommunikation" },
  { to: "/chat", icon: MessageSquare, label: "Chat", section: "Kommunikation" },
  { to: "/employees", icon: Users, label: "Medarbejdere", section: "Administration" },
  { to: "/company", icon: Building2, label: "Virksomhed", section: "Administration" },
];

const employeeLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", section: "Oversigt" },
  { to: "/cases", icon: Briefcase, label: "Mine sager", section: "Oversigt" },
  { to: "/schedule", icon: Calendar, label: "Min plan", section: "Planlægning" },
  { to: "/time-tracking", icon: Clock, label: "Timer", section: "Planlægning" },
  { to: "/reports", icon: FileText, label: "Rapporter", section: "KLS Dokumenter" },
  { to: "/verification", icon: ClipboardCheck, label: "Kontrolskemaer", section: "KLS Dokumenter" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation", section: "KLS Dokumenter" },
  { to: "/field-reports", icon: Radio, label: "Feltrapport", section: "Kommunikation" },
  { to: "/chat", icon: MessageSquare, label: "Chat", section: "Kommunikation" },
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
    <aside className="flex h-full w-[272px] flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3.5 px-6 flex-shrink-0">
        <div>
          <span className="font-heading text-2xl font-extrabold italic tracking-tight text-primary">ASA</span>
          <p className="text-[9px] font-semibold text-primary/60 tracking-[0.18em] uppercase leading-none">Kontrolsystem</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4 scrollbar-thin">
        {Object.entries(sections).map(([section, sectionLinks]) => (
          <div key={section} className="mb-5">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">{section}</p>
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
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary/10 text-sidebar-primary"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-0 bottom-0 my-auto h-5 w-[3px] rounded-full bg-sidebar-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <link.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile - fixed at bottom */}
      <div className="border-t border-sidebar-border px-3 py-3 flex-shrink-0 bg-sidebar">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
            isActive ? "bg-sidebar-primary/10" : "hover:bg-sidebar-accent"
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white shadow-[0_2px_8px_hsl(215_80%_56%/0.25)] flex-shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() || (role === "admin" ? "A" : "M")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-sidebar-accent-foreground truncate">
              {profile?.full_name || (role === "admin" ? "Administrator" : "Medarbejder")}
            </p>
            <p className="text-[11px] text-sidebar-foreground/40 truncate">
              {role === "admin" ? "Administrator" : "Medarbejder"}
            </p>
          </div>
          {onSignOut && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSignOut(); }} className="rounded-lg p-2 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-destructive transition-colors flex-shrink-0">
              <LogOut size={15} />
            </button>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
