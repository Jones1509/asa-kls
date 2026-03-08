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
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  role: "admin" | "employee";
  onNavigate?: () => void;
}

const adminLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/cases", icon: Briefcase, label: "Sager" },
  { to: "/schedule", icon: Calendar, label: "Kalender" },
  { to: "/time-tracking", icon: Clock, label: "Timeregistrering" },
  { to: "/reports", icon: FileText, label: "Rapporter" },
  { to: "/verification", icon: ClipboardCheck, label: "Kontrolskemaer" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation" },
  { to: "/employees", icon: Users, label: "Medarbejdere" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

const employeeLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/cases", icon: Briefcase, label: "Mine sager" },
  { to: "/schedule", icon: Calendar, label: "Min plan" },
  { to: "/time-tracking", icon: Clock, label: "Timer" },
  { to: "/reports", icon: FileText, label: "Rapporter" },
  { to: "/verification", icon: ClipboardCheck, label: "Kontrolskemaer" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

export function AppSidebar({ role, onNavigate }: AppSidebarProps) {
  const links = role === "admin" ? adminLinks : employeeLinks;

  return (
    <aside className="flex h-full w-[260px] flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Shield size={18} className="text-sidebar-primary-foreground" />
        </div>
        <div>
          <span className="font-heading text-lg font-bold text-sidebar-accent-foreground">
            ASA KLS
          </span>
          <p className="text-[11px] text-sidebar-foreground/60 leading-none">
            Kontrolsystem
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {role === "admin" ? "A" : "M"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {role === "admin" ? "Administrator" : "Medarbejder"}
            </p>
            <p className="text-xs text-sidebar-foreground/50">
              {role === "admin" ? "admin@asakls.dk" : "bruger@asakls.dk"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
