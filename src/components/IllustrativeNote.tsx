import type { ReactNode } from "react";

export function IllustrativeNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200/75">
      {children ?? "Illustrative model output"}
    </p>
  );
}
