import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export function FinancialExposureCard({
  title,
  amountInr,
  caption,
}: {
  title: string;
  amountInr: number;
  caption?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-bold text-slate-900">{formatInr(amountInr)}</p>
        <p className="mt-2 text-[11px] uppercase tracking-wider text-amber-700 font-medium">
          Illustrative model output
        </p>
        {caption ? <p className="mt-1 text-xs text-slate-500">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}
