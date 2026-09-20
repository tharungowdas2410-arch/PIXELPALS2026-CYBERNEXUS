import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import type { AIRecommendation, AdvisorQuestion } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function AIAdvisor({
  questions,
  answer,
  onAsk,
}: {
  questions: AdvisorQuestion[];
  answer: AIRecommendation;
  onAsk?: (id: string) => void;
}) {
  return (
    <DashboardCard
      title="AI Risk Advisor"
      description="Ranked, evidence-linked guidance. Not a prediction of incidents."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-slate-500">Example questions</p>
          {questions.map((question) => (
            <Button
              key={question.id}
              variant={answer.question === question.prompt ? "default" : "secondary"}
              className="h-auto w-full justify-start whitespace-normal py-2 text-left text-xs font-normal"
              onClick={() => onAsk?.(question.id)}
            >
              {question.prompt}
            </Button>
          ))}
        </div>
        <div className="space-y-4 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-sm font-semibold text-slate-900">Q: {answer.question}</p>
          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-blue-700 font-bold">Recommendation</h4>
            <p className="mt-1 text-sm text-slate-800 leading-relaxed font-medium">{answer.recommendation}</p>
          </section>
          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Reasoning</h4>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-600">
              {answer.reasoning.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Evidence</h4>
            <ul className="mt-1 space-y-1 text-xs text-slate-600">
              {answer.evidence.map((item) => (
                <li key={item.source}>
                  <span className="font-semibold text-slate-800">{item.source}:</span> {item.detail}
                </li>
              ))}
            </ul>
          </section>
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-[#E2E8F0] pt-3">
            <div>
              <p className="text-slate-500 font-medium">Confidence</p>
              <p className="font-mono font-bold text-slate-900">{Math.round(answer.confidence * 100)}%</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Reflects evidence completeness, not certainty.
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Expected risk reduction</p>
              <p className="text-emerald-700 font-bold font-mono">{answer.expectedRiskReduction}</p>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500 border-t border-[#E2E8F0] pt-2">{answer.limitations}</p>
          <IllustrativeNote />
        </div>
      </div>
    </DashboardCard>
  );
}

export function RecommendationCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-blue-700 font-bold">{title}</p>
      <p className="mt-1 text-sm text-slate-800 font-medium">{body}</p>
    </div>
  );
}
