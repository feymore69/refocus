import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-white/20 bg-white/8 p-5 shadow-xl shadow-black/10 backdrop-blur-xl",
      className,
    )}
    {...props}
  />
);
