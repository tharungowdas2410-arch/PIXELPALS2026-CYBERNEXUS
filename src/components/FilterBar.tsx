import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#0c1322] p-3">
      {children}
    </div>
  );
}
