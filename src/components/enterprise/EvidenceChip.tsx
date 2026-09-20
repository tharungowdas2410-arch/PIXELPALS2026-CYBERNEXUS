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
        "inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-xs text-blue-900 transition-colors hover:border-blue-300",
        className
      )}
      title={`Full SHA-256 Digest: ${hash}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
        {sourceType}
      </span>
      <span className="font-mono text-[11px] text-slate-700 font-medium">{shortHash}</span>
      {verified && (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700"
          title="Cryptographically verified on immutable ledger"
        >
          <CheckCircle2 className="h-3 w-3" />
          VERIFIED
        </span>
      )}
      <button
        type="button"
        onClick={copyToClipboard}
        className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
        aria-label="Copy evidence hash"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}
