"""Document ingestion, chunking, and standard cybersecurity framework seeding."""

from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.rag.embedding_service import fallback_embed

SEED_FRAMEWORKS = [
    {
        "title": "NIST Cybersecurity Framework (CSF 2.0)",
        "framework": "NIST CSF",
        "document_type": "standard",
        "source": "NIST Special Publication 1300",
        "version": "2.0",
        "content": (
            "The NIST Cybersecurity Framework 2.0 organizes cybersecurity actions into six core Functions: "
            "Govern (GV), Identify (ID), Protect (PR), Detect (DE), Respond (RS), and Recover (RC). "
            "PR.AC-1 enforces identity management, authentication and access control credentials, requiring multi-factor authentication (MFA) "
            "for all administrative and remote access to break credential-stuffing attack paths. "
            "PR.DS-2 ensures data protection at rest and in transit through end-to-end cryptographic mechanisms. "
            "DE.CM-1 mandates continuous security monitoring across endpoints, identities, and networks to detect anomalies promptly. "
            "RS.MA-1 establishes incident management procedures to contain and mitigate verified breaches."
        ),
    },
    {
        "title": "ISO/IEC 27001:2022 Information Security Management",
        "framework": "ISO 27001",
        "document_type": "standard",
        "source": "ISO/IEC 27001:2022 Annex A",
        "version": "2022",
        "content": (
            "ISO/IEC 27001:2022 specifies requirements for establishing, implementing, maintaining, and continually improving an ISMS. "
            "Control A.8.5 enforces Secure Authentication, mandating MFA and contextual identity controls for sensitive systems and payment environments. "
            "Control A.8.20 covers Network Security Management, requiring network segmentation between public gateways, application servers, and sensitive customer databases. "
            "Control A.8.8 mandates Management of Technical Vulnerabilities, establishing strict patching timelines for critical CVSS vulnerabilities. "
            "Control A.8.13 enforces Information Backup, requiring regular testing of immutable and offsite backup resilience against ransomware."
        ),
    },
    {
        "title": "CIS Critical Security Controls v8",
        "framework": "CIS Controls",
        "document_type": "benchmark",
        "source": "Center for Internet Security v8",
        "version": "8.0",
        "content": (
            "The CIS Critical Security Controls v8 are a prioritized set of actions for cyber defense. "
            "CIS Control 1 mandates Inventory and Control of Enterprise Assets to maintain full CMDB visibility. "
            "CIS Control 4 ensures Secure Configuration of Enterprise Assets and Software, disabling unneeded services and protocols. "
            "CIS Control 6 requires Access Control Management, implementing centralized MFA and role-based least privilege. "
            "CIS Control 7 enforces Continuous Vulnerability Management, scanning and remediating exploitable CVEs within 14 days for internet-facing assets. "
            "CIS Control 10 mandates Data Recovery Capabilities with automated, verified, and isolated backups."
        ),
    },
    {
        "title": "RBI Cybersecurity Framework for Financial Entities",
        "framework": "RBI",
        "document_type": "regulatory_guideline",
        "source": "Reserve Bank of India Master Direction",
        "version": "2024",
        "content": (
            "The Reserve Bank of India (RBI) mandates stringent cybersecurity baseline controls for banking and payment infrastructures. "
            "Financial institutions must enforce multi-factor authentication (MFA) for all administrative and customer transaction gateways. "
            "Payment applications and core banking databases must be isolated through micro-segmentation with zero-trust network boundaries. "
            "Entities must maintain a 24x7 Security Operations Centre (SOC) with automated telemetry, EDR endpoint coverage, and continuous vulnerability assessment. "
            "A comprehensive Cyber Crisis Management Plan (CCMP) must be tested semi-annually with immutable backup recovery drills."
        ),
    },
    {
        "title": "SEBI Cybersecurity & Cyber Resilience Framework (CSCRF)",
        "framework": "SEBI",
        "document_type": "regulatory_guideline",
        "source": "Securities and Exchange Board of India Circular",
        "version": "2024",
        "content": (
            "SEBI's Cybersecurity and Cyber Resilience Framework requires regulated market entities to maintain robust cyber governance. "
            "All Critical Business Services including trading, settlement, and customer databases must be classified under high criticality tiers. "
            "Privileged access must mandate biometric or hardware-token MFA with session recording and zero standing privileges. "
            "Security vulnerability remediation SLAs are strictly capped: Critical severity CVEs must be patched within 48 hours. "
            "Entities must perform periodic red-teaming, attack path analysis, and maintain cryptographically verifiable evidence of risk assessments."
        ),
    },
    {
        "title": "Internal Enterprise Security Architecture Policy",
        "framework": "Internal Policy",
        "document_type": "internal_policy",
        "source": "CYBERNEXUS Enterprise Architecture Standards",
        "version": "2026.1",
        "content": (
            "Enterprise Policy POL-SEC-01 mandates Zero Trust Identity Architecture across all cloud and on-premise environments. "
            "Policy POL-SEC-04 requires mandatory Endpoint Detection and Response (EDR) agent deployment on 100% of production and customer-facing servers. "
            "Policy POL-NET-02 mandates strict three-tier network segmentation separating Internet Gateway/VPN, Web/App Tier, and Payment/Database Tier. "
            "Policy POL-BCP-01 mandates air-gapped, immutable backup retention with monthly recovery validation to mitigate ransomware financial exposure."
        ),
    },
]


def chunk_text(text: str, chunk_size: int = 350, overlap: int = 50) -> list[str]:
    """Splits long text into overlapping chunks for retrieval."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(words):
        chunk_words = words[start : start + chunk_size]
        chunks.append(" ".join(chunk_words))
        start += chunk_size - overlap
    return chunks


async def seed_default_frameworks(session: AsyncSession) -> int:
    """Seeds static cybersecurity frameworks into knowledge base if empty."""
    existing = list(await session.scalars(select(KnowledgeDocument).limit(1)))
    if existing:
        return 0

    total_chunks = 0
    for item in SEED_FRAMEWORKS:
        doc = KnowledgeDocument(
            id=uuid4(),
            title=item["title"],
            framework=item["framework"],
            document_type=item["document_type"],
            source=item["source"],
            version=item["version"],
            content=item["content"],
        )
        session.add(doc)
        await session.flush()

        chunks = chunk_text(item["content"])
        for idx, chunk_text_content in enumerate(chunks):
            embedding = fallback_embed(chunk_text_content)
            chunk = KnowledgeChunk(
                id=uuid4(),
                document_id=doc.id,
                chunk_index=idx,
                content=chunk_text_content,
                embedding=embedding,
                metadata_json={"title": doc.title, "framework": doc.framework, "source": doc.source},
            )
            session.add(chunk)
            total_chunks += 1

    await session.commit()
    return total_chunks
