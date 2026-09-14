# CYBERNEXUS — Grounded AI Risk Advisor Architecture

**Problem Statement ID:** SIH 26105  
**Component:** Zero-Hallucination Quantitative Cyber Risk Advisor  
**Primary Interface:** `/ai-risk-advisor` and `POST /api/v1/advisor/ask`  

---

## 1. Architectural Philosophy: Why Zero-Hallucination Matters

In enterprise cybersecurity and board-level capital allocation, a language model **must never hallucinate numbers, fabricate attack paths, or invent return-on-investment multipliers**. 

Traditional chatbots generate plausible-sounding text from unverified probability distributions. CYBERNEXUS enforces an architectural firewall between **computation** and **language synthesis**:

```
[User Query]
     │
     ▼
[1. Intent Extraction & Orchestration Planner]
     │
     ▼
[2. Grounded Tool Execution Pipeline]
     ├── Query PostgreSQL Risk Register
     ├── Traversal via Neo4j Graph Service
     ├── Actuarial Computation via Financial Engine
     └── Knapsack Optimization via Google OR-Tools
     │
     ▼
[3. Verified Tool Artifact Context Assembly]
     │
     ▼
[4. Constrained Narrative Synthesis Engine (GPT-4o-mini or Deterministic Fallback)]
     │
     ▼
[5. Injection Defense & Credential Redaction Guardrails]
     │
     ▼
[Structured Response Cards + Mathematical Citations + Hash Attestation]
```

---

## 2. The 5 Grounded Subsystem Tools

When a user submits an executive question, the advisor executes one or more of these read-only Python tools:

| Tool Identifier | Subsystem | Grounded Output Produced |
| :--- | :--- | :--- |
| `get_risk_summary` | PostgreSQL Risk Register | Inherent score, residual risk, active critical CVE count, top risk drivers |
| `get_critical_attack_paths` | Neo4j Graph Engine | Crown-jewel traversal chains, weakest links, path scores |
| `get_financial_exposure` | Actuarial Model | Expected Annual Loss (EAL), 95% Value at Risk (VaR), Probable Max Loss |
| `optimize_security_investment` | Google OR-Tools Knapsack | Recommended controls, capital allocated, loss avoided, ROSI multiplier |
| `get_ml_risk_signals` | Scikit-Learn Model | Ranked asset incident probabilities, feature attribution |

Every number presented in the final executive briefing is directly traceable to a tool execution result with a cryptographic digest.

---

## 3. Defense Against Prompt Injections & Jailbreaks

Implemented in `backend/app/services/ai_advisor/guardrails.py`:

### 3.1 Adversarial Pattern Interception
Inquiries are checked against a compiled set of prompt injection signatures:
- *"ignore previous instructions"*
- *"system prompt override"*
- *"reveal system prompt"*
- *"execute shell command"*
- *"drop table / execute sql"*
- *"bypass rbac"*

Adversarial inputs are halted immediately before tool invocation, returning a security refusal with correlation ID.

### 3.2 Read-Only Tool Execution Boundaries
The advisor has **no access to modifying endpoints**. It cannot update database rows, cannot trigger autonomous patch deployments, and cannot write to external network sockets.

### 3.3 Redaction Guardrails
All outgoing synthesized text is scanned via regular expressions to scrub:
- OpenAI / Cloud API keys (`sk-[a-zA-Z0-9]{20,}`)
- Bearer tokens
- Database connection strings with embedded passwords

---

## 4. Graceful Degradation & Deterministic Fallback Mode

If no external OpenAI API key is configured (`OPENAI_API_KEY=""`), or if external connectivity is severed:
1. **The advisor does NOT fail or throw an error.**
2. It activates the **Deterministic Rule-Based Synthesis Engine**.
3. It takes the structured JSON results from the 5 tools and populates a deterministic, CISO-approved executive template.
4. Confidence is reported as `HIGH (DETERMINISTIC FALLBACK)`.
5. All financial metrics (EAL, ROSI, allocations) remain 100% mathematically exact.
