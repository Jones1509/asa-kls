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

export function StatCard({ title, value, icon, description, trend, trendValue, className }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-extrabold font-heading text-card-foreground tracking-tight">{value}</p>
          {(description || trendValue) && (
            <div className="flex items-center gap-1.5">
              {trend === "up" && <TrendingUp size={13} className="text-success" />}
              {trend === "down" && <TrendingDown size={13} className="text-destructive" />}
              {trend === "neutral" && <Minus size={13} className="text-muted-foreground" />}
              <p className={cn(
                "text-xs font-medium",
                trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}>
                {trendValue || description}
              </p>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      {/* Subtle gradient overlay */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
    </motion.div>
  );
}
