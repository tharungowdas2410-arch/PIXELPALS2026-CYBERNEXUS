import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "secondary" | "destructive" | string;
}

export function Badge({
  className,
  variant,
  ...props
}: BadgeProps) {
  const variantStyles = variant === "outline" ? "border-white/20 bg-transparent text-slate-200" : "";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded border border-white/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-300",
        variantStyles,
        className,
      )}
      {...props}
    />
  );
}
