import { formatInr, formatMultiple } from "@/lib/format";
import type { ScenarioResult } from "@/lib/types";
import { IllustrativeNote } from "@/components/IllustrativeNote";

export function ScenarioComparison({ result }: { result: ScenarioResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Current state</p>
        <p className="mt-3 font-mono text-3xl font-bold text-slate-900">{result.currentRisk}</p>
        <p className="text-xs text-slate-500">Risk score</p>
        <p className="mt-3 font-mono text-xl font-semibold text-slate-800">{formatInr(result.currentExposureInr)}</p>
        <p className="text-xs text-slate-500">Exposure</p>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
        <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">Result</p>
        <p className="mt-3 font-mono text-3xl font-bold text-slate-900">{result.resultRisk}</p>
        <p className="text-xs text-slate-500">Risk score</p>
        <p className="mt-3 font-mono text-xl font-semibold text-slate-800">{formatInr(result.resultExposureInr)}</p>
        <p className="text-xs text-slate-500">Exposure</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">
        <Stat label="Risk reduction" value={`${result.riskReductionPoints} pts`} />
        <Stat label="Investment" value={formatInr(result.investmentInr)} />
        <Stat label="Modeled loss avoided" value={formatInr(result.modeledLossAvoidedInr)} />
        <Stat label="ROSI" value={formatMultiple(result.rosi)} />
      </div>
      <div className="md:col-span-2">
        <IllustrativeNote>Illustrative scenario</IllustrativeNote>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 shadow-xs">
      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
