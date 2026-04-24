import type { ReactNode } from "react";
import { History, LayoutDashboard, Settings } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { cn } from "../lib/cn";

type View = "dashboard" | "settings" | "history";

interface AppShellProps {
  activeView: View;
  onChangeView: (view: View) => void;
  children: ReactNode;
}

export const AppShell = ({ activeView, onChangeView, children }: AppShellProps) => (
  <div className="mx-auto min-h-screen max-w-6xl px-4 py-4">
    <header className="mb-4 flex items-center justify-between gap-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Refocus</p>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Smart screen breaks that respect your flow</h1>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-black/20 p-1">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "settings", label: "Settings", icon: Settings },
          { id: "history", label: "History", icon: History },
        ].map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onChangeView(item.id as View)}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "h-9 px-3 text-xs text-[var(--muted)]",
                selected && "border border-white/30 bg-white/20 text-[var(--text)] shadow-inner shadow-white/15",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </div>
    </header>
    <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.main>
  </div>
);
