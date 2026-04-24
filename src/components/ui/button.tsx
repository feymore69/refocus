import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/cn";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)] hover:brightness-105 active:brightness-95",
  secondary: "bg-white/10 text-[var(--text)] hover:bg-white/15 border border-white/15",
  ghost: "text-[var(--text)] hover:bg-white/10",
  danger: "bg-rose-500/90 text-white hover:bg-rose-500",
};

export const Button = ({ className, variant = "secondary", children, ...props }: ButtonProps) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    className={cn(
      "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 disabled:pointer-events-none disabled:opacity-40",
      variantClasses[variant],
      className,
    )}
    {...props}
  >
    {children}
  </motion.button>
);
