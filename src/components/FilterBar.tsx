import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-xs">
      {children}
    </div>
  );
}
