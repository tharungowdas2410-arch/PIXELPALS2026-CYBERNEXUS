import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  description,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const desc = description ?? subtitle;
  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-[13px] uppercase tracking-[0.14em] text-slate-400">
            {title}
          </CardTitle>
          {desc ? <CardDescription className="mt-1">{desc}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}
