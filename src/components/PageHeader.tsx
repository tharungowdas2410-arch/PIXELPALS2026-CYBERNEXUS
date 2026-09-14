import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badges,
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  badges?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[28px]">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {badges}
        {actions}
        {children}
      </div>
    </div>
  );
}
