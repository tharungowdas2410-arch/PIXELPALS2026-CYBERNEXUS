import React from "react";
import { CheckCircle2, Copy, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceChipProps {
  hash: string;
  sourceType?: string;
  timestamp?: string;
  verified?: boolean;
  className?: string;
}

export function EvidenceChip({
  hash,
  sourceType = "BLOCKCHAIN",
  timestamp,
  verified = true,
  className,
}: EvidenceChipProps) {
  const shortHash = hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;

  const copyToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(hash);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-200 transition-colors hover:border-cyan-500/40",
        className
      )}
      title={`Full SHA-256 Digest: ${hash}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
        {sourceType}
      </span>
      <span className="font-mono text-[11px] text-slate-300">{shortHash}</span>
      {verified && (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400"
          title="Cryptographically verified on immutable ledger"
        >
          <CheckCircle2 className="h-3 w-3" />
          VERIFIED
        </span>
      )}
      <button
        type="button"
        onClick={copyToClipboard}
        className="text-slate-500 hover:text-cyan-300 transition-colors p-0.5"
        aria-label="Copy evidence hash"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}
