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
  const variantStyles =
    variant === "outline"
      ? "border-[#E2E8F0] bg-transparent text-slate-700"
      : variant === "secondary"
      ? "border-[#E2E8F0] bg-slate-100 text-slate-700"
      : variant === "destructive"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-[#E2E8F0] bg-slate-100 text-slate-700";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        variantStyles,
        className,
      )}
      {...props}
    />
  );
}
