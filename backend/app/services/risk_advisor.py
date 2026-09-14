"""Replaceable rule-based advisor. No LLM is connected."""

from typing import Any

from app.models.risk import Risk


class RiskAdvisorService:
    def answer_question(
        self,
        question: str,
        *,
        risks: list[Risk],
        budget: float | None = None,
    ) -> dict[str, Any]:
        text = question.lower()
        ranked = sorted(risks, key=lambda item: item.residual_risk, reverse=True)
        top = ranked[:3]
        supporting = [
            {
                "id": str(item.id),
                "residual_risk": item.residual_risk,
                "expected_annual_loss": float(item.expected_annual_loss),
            }
            for item in top
        ]
        if "payment" in text:
            answer = "Payment Service risk is driven by weak service-to-service authentication on a high-value path."
            actions = ["Tighten service identity", "Complete privileged MFA"]
        elif "mfa" in text or "lakh" in text or "spend" in text:
            answer = "Spend first on privileged MFA: it has the highest illustrative ROSI for a modest outlay."
            actions = ["Complete privileged MFA", "Then expand EDR coverage"]
        elif "fix first" in text or "what should i fix" in text:
            answer = "Fix the internet-facing VPN path first; it combines exposure, exploitability and business value."
            actions = ["Patch VPN CVEs", "Enforce MFA on VPN/IdP"]
        elif "top" in text:
            answer = "Top illustrative residual risks sit on the VPN, identity provider and customer database."
            actions = ["Close critical VPN findings", "Reduce standing privilege"]
        else:
            answer = (
                "Highest residual scores come from internet-facing VPN and identity paths. "
                "This ranking is deterministic over stored risk rows, not an LLM prediction."
            )
            actions = ["Prioritize MFA", "Patch critical CVEs"]
        loss = float(sum(float(item.expected_annual_loss) for item in top))
        return {
            "answer": answer,
            "supporting_risks": supporting,
            "recommended_actions": actions,
            "financial_impact": {
                "illustrative_eal_in_scope": round(loss, 2),
                "budget_context": budget,
            },
            "confidence": 0.72,
            "assumptions": [
                "No LLM is connected.",
                "Responses are rule-based over stored illustrative risk rows.",
            ],
        }

    def generate_recommendation(self, risks: list[Risk]) -> dict[str, Any]:
        return self.answer_question("What should I fix first?", risks=risks)

    def explain_risk(self, risk: Risk) -> dict[str, Any]:
        return self.answer_question(f"Explain risk {risk.id}", risks=[risk])
