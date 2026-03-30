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
import asaLogo from "@/assets/asa-logo.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
  role: "admin" | "employee";
  profile?: { full_name: string; email: string; avatar_url?: string | null } | null;
  onNavigate?: () => void;
  onSignOut?: () => void;
}

const adminLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", section: "Oversigt" },
  { to: "/customers", icon: Contact, label: "Kunder", section: "Projekter" },
  { to: "/invoices", icon: Receipt, label: "Fakturaer", section: "Økonomi" },
  { to: "/schedule", icon: Calendar, label: "Kalender", section: "Planlægning" },
  { to: "/time-tracking", icon: Clock, label: "Timeregistrering", section: "Planlægning" },
  { to: "/chat", icon: MessageSquare, label: "Chat", section: "Kommunikation" },
  { to: "/verification", icon: ClipboardCheck, label: "Verifikationsskemaer", section: "KLS & Kvalitet" },
  { to: "/field-reports", icon: Radio, label: "Feltrapporter", section: "KLS & Kvalitet" },
  { to: "/documentation", icon: FolderOpen, label: "Dokumentation", section: "KLS & Kvalitet" },
  { to: "/deviations", icon: AlertOctagon, label: "Afvigelser", section: "KLS & Kvalitet" },
  { to: "/company", icon: Building2, label: "KLS Dokumentation", section: "KLS & Kvalitet" },
  { to: "/employees", icon: Users, label: "Medarbejdere", section: "Administration" },
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

  const initials = profile?.full_name?.charAt(0)?.toUpperCase() || (role === "admin" ? "A" : "M");

  return (
    <aside className="flex h-full w-[264px] flex-col bg-sidebar text-white">
      {/* Logo */}
      <div className="flex flex-col justify-center px-6 py-4 flex-shrink-0 border-b border-white/10">
        <img src={asaLogo} alt="ASA El-Service" className="h-10" />
        <p className="text-[8px] font-medium tracking-[0.15em] uppercase text-white/35 mt-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>Kvalitetsledelsessystem</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-4 scrollbar-thin">
        {Object.entries(sections).map(([section, sectionLinks]) => (
          <div key={section} className="mb-5">
            <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">{section}</p>
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
                        ? "bg-white/12 text-white"
                        : "text-white/70 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 inset-y-0 my-auto h-5 w-[3px] rounded-full bg-white"
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
      <div className="border-t border-white/10 px-3 py-3 flex-shrink-0">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
            isActive ? "bg-white/12" : "hover:bg-white/8"
          )}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.full_name} />}
            <AvatarFallback className="bg-white/15 text-white text-[11px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">
              {profile?.full_name || (role === "admin" ? "Administrator" : "Medarbejder")}
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {role === "admin" ? "Administrator" : "Medarbejder"}
            </p>
          </div>
          {onSignOut && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSignOut(); }} className="rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-destructive transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          )}
        </NavLink>
      </div>
    </aside>
  );
}