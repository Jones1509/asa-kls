import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export const StatCard = ({ title, value, icon, description, trend, trendValue, className }: StatCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "var(--shadow-elevated)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
          <p className="text-2xl font-extrabold font-heading text-card-foreground tracking-tight tabular-nums">{value}</p>
          {(description || trendValue) && (
            <div className="flex items-center gap-1.5">
              {trend === "up" && <TrendingUp size={12} className="text-success" />}
              {trend === "down" && <TrendingDown size={12} className="text-destructive" />}
              {trend === "neutral" && <Minus size={12} className="text-muted-foreground" />}
              <p className={cn(
                "text-[11px] font-medium",
                trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}>
                {trendValue || description}
              </p>
            </div>
          )}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          {icon}
        </div>
      </div>
      {/* Subtle gradient overlay */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/[0.04] blur-2xl" />
    </motion.div>
  );
};
