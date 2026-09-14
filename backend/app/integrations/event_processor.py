"""Continuous Security Telemetry Event Processor Pipeline.

Orchestrates:
Incoming Event → Validation → Normalization → Asset Resolution → Threat Resolution
→ Identity Resolution → Risk Signal Update → ML Inference → Neo4j Graph Update
→ Financial Risk Recalculation → Risk Change Event & Alert Generation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.correlation import CorrelationService
from app.integrations.normalization import ConnectorType, EventSeverity, EventType, NormalizedSecurityEvent
from app.integrations.registry import connector_registry
from app.models.asset import Asset
from app.models.control import Control
from app.models.enums import AssetType, RemediationStatus, Severity
from app.models.financial_risk import FinancialRisk
from app.models.risk import Risk
from app.models.telemetry import IntegrationConfig, RiskAlert, RiskChangeEvent, SecurityEvent, ThreatIndicator
from app.models.threat import Threat
from app.models.vulnerability import Vulnerability
from app.services.blockchain_service import record_evidence
from app.services.financial_engine import calculate_eal
from app.services.graph_sync_service import GraphSyncService
from app.services.ml_risk_service import build_asset_features, persist_prediction
from app.services.risk_engine import factor_dicts, quantify_risk
from ml.inference.predictor import predictor

log = logging.getLogger(__name__)


class EventProcessor:
    """Core pipeline for processing telemetry events into quantified continuous risk."""

    def __init__(self, db: AsyncSession, organization_id: UUID) -> None:
        self.db = db
        self.organization_id = organization_id
        self.graph_sync = GraphSyncService()

    async def process_normalized_event(
        self,
        event_data: NormalizedSecurityEvent,
        notarize_blockchain: bool = False,
    ) -> dict[str, Any]:
        """Process a validated and normalized security event through the complete pipeline."""
        # 1. Asset Resolution
        asset = await self._resolve_asset(event_data)

        # 2. Persist SecurityEvent record
        db_event = SecurityEvent(
            organization_id=self.organization_id,
            source=event_data.source,
            source_event_id=event_data.source_event_id,
            event_type=event_data.event_type.value,
            timestamp=event_data.timestamp,
            severity=event_data.severity.value,
            asset_id=asset.id if asset else None,
            identity_id=event_data.identity_id,
            ip_address=event_data.ip_address,
            hostname=event_data.hostname,
            description=event_data.description,
            raw_reference=event_data.raw_reference,
            normalized_data=event_data.normalized_data,
            processed=False,
            is_demo=event_data.is_demo,
        )
        self.db.add(db_event)
        await self.db.flush()

        # 3. Threat Resolution (IoC match)
        threat_match = await self._resolve_threat_indicator(event_data)

        # 4. Correlation Analysis
        correlation = await CorrelationService.evaluate_event(self.db, db_event)

        # 5. Targeted Entity & Vulnerability Updates
        vuln_affected = False
        if asset:
            vuln_affected = await self._handle_vulnerability_lifecycle(asset, event_data)

        # 6. Targeted Risk & Financial Recalculation
        risk_change = None
        alert = None
        if asset:
            risk_change, alert = await self._recalculate_asset_risk(
                asset=asset,
                event=db_event,
                threat_match=threat_match,
                correlation=correlation,
                notarize_blockchain=notarize_blockchain,
            )

            # 7. Targeted ML Inference (if predictor is available)
            try:
                features = await build_asset_features(self.db, self.organization_id, asset)
                pred_result = predictor.load().predict(features)
                await persist_prediction(
                    self.db,
                    organization_id=self.organization_id,
                    asset_id=asset.id,
                    prediction_type="continuous_incident_signal",
                    value=pred_result["incident_probability"],
                    result=pred_result,
                )
            except Exception as exc:
                log.debug("ML inference skipped or model uninitialized: %s", exc)

            # 8. Neo4j Graph Update (idempotent safe sync)
            try:
                await self.graph_sync.sync_asset(self.db, self.organization_id, asset.id)
            except Exception as exc:
                log.debug("Neo4j sync skipped or unavailable: %s", exc)

        db_event.processed = True
        await self.db.commit()

        return {
            "status": "PROCESSED",
            "event_id": str(db_event.id),
            "source": db_event.source,
            "event_type": db_event.event_type,
            "severity": db_event.severity,
            "asset_id": str(asset.id) if asset else None,
            "asset_resolved": asset is not None,
            "unresolved_reason": None if asset else f"No asset matched host '{event_data.hostname}' or IP '{event_data.ip_address}'",
            "threat_matched": threat_match is not None,
            "threat_actor": threat_match.threat_actor if threat_match else None,
            "correlated": correlation is not None and correlation.is_correlated,
            "correlation_pattern": correlation.pattern_name if correlation else None,
            "risk_change_event_id": str(risk_change.id) if risk_change else None,
            "previous_score": risk_change.previous_score if risk_change else None,
            "new_score": risk_change.new_score if risk_change else None,
            "score_delta": risk_change.score_delta if risk_change else 0.0,
            "previous_eal": float(risk_change.previous_eal) if risk_change else None,
            "new_eal": float(risk_change.new_eal) if risk_change else None,
            "eal_delta": float(risk_change.eal_delta) if risk_change else 0.0,
            "alert_generated": alert is not None,
            "alert_id": str(alert.id) if alert else None,
            "blockchain_notarized": risk_change.blockchain_evidence_id is not None if risk_change else False,
        }

    async def _resolve_asset(self, event: NormalizedSecurityEvent) -> Asset | None:
        """Resolve telemetry to an existing Asset by ID, hostname, IP, or exact name matching."""
        if event.asset_id:
            asset = await self.db.get(Asset, event.asset_id)
            if asset and asset.organization_id == self.organization_id:
                return asset

        # Query all org assets
        stmt = select(Asset).where(Asset.organization_id == self.organization_id)
        assets = list((await self.db.scalars(stmt)).all())

        candidates = []
        host_target = (event.hostname or "").strip().lower()
        ip_target = (event.ip_address or "").strip()

        for a in assets:
            a_name = (a.name or "").lower()
            a_desc = (a.description or "").lower()

            host_clean = host_target.replace("-", " ").replace("_", " ")
            name_clean = a_name.replace("-", " ").replace("_", " ")

            # Exact, substring, or hyphen/word match
            if host_target and (
                host_target in a_name
                or a_name in host_target
                or host_clean in name_clean
                or any(len(w) >= 3 and w in name_clean for w in host_clean.split())
            ):
                candidates.append(a)
            # IP address match in description or name
            elif ip_target and (ip_target in a_desc or ip_target in a_name):
                candidates.append(a)
            # Cloud resource ARN or resource ID match
            elif event.raw_reference and a_name in event.raw_reference.lower():
                candidates.append(a)

        if candidates:
            return candidates[0]

        # If no assets exist in org and this is a demo event, provision primary demo asset
        if not assets and event.is_demo:
            default_asset = Asset(
                organization_id=self.organization_id,
                name=event.hostname or "Payment Gateway Service",
                asset_type=AssetType.APPLICATION,
                criticality=5,
                business_value=15_000_000.0,
                exposure="internet",
                owner="FinOps",
            )
            self.db.add(default_asset)
            await self.db.flush()
            return default_asset

        return None

    async def _resolve_threat_indicator(self, event: NormalizedSecurityEvent) -> ThreatIndicator | None:
        """Check if incoming event involves an indicator of compromise in the threat database."""
        indicators_to_check = []
        if event.ip_address:
            indicators_to_check.append(event.ip_address)
        ioc_in_data = (event.normalized_data or {}).get("indicator")
        if ioc_in_data:
            indicators_to_check.append(ioc_in_data)

        if not indicators_to_check:
            return None

        stmt = select(ThreatIndicator).where(
            ThreatIndicator.indicator.in_(indicators_to_check),
            ThreatIndicator.active.is_(True),
        )
        match = (await self.db.scalars(stmt)).first()
        return match

    async def _handle_vulnerability_lifecycle(self, asset: Asset, event: NormalizedSecurityEvent) -> bool:
        """Create or update vulnerability records, preventing duplicate CVEs on the same asset."""
        if event.event_type not in (EventType.VULNERABILITY_FOUND, EventType.VULNERABILITY_REMEDIATED):
            return False

        cve_id = (event.normalized_data or {}).get("cve_id")
        cvss_score = float((event.normalized_data or {}).get("cvss_score", 7.5))

        # Check existing CVE on asset
        stmt = select(Vulnerability).where(
            Vulnerability.asset_id == asset.id,
            Vulnerability.cve_id == cve_id,
        )
        vuln = (await self.db.scalars(stmt)).first()

        if event.event_type == EventType.VULNERABILITY_REMEDIATED:
            if vuln:
                vuln.remediation_status = RemediationStatus.CLOSED
                vuln.exploitability = 0.05
                await self.db.flush()
                return True
            return False

        # VULNERABILITY_FOUND
        severity_enum = Severity.CRITICAL if cvss_score >= 9.0 else (Severity.HIGH if cvss_score >= 7.0 else Severity.MEDIUM)
        exploitability = 0.85 if cvss_score >= 9.0 else 0.55

        if vuln:
            vuln.cvss_score = cvss_score
            vuln.exploitability = exploitability
            vuln.severity = severity_enum
            vuln.remediation_status = RemediationStatus.OPEN
        else:
            vuln = Vulnerability(
                asset_id=asset.id,
                cve_id=cve_id or f"CVE-DEMO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                title=event.description[:250],
                description=event.description,
                cvss_score=cvss_score,
                exploitability=exploitability,
                severity=severity_enum,
                remediation_status=RemediationStatus.OPEN,
                discovered_at=datetime.now(timezone.utc),
            )
            self.db.add(vuln)
        await self.db.flush()
        return True

    async def _recalculate_asset_risk(
        self,
        asset: Asset,
        event: SecurityEvent,
        threat_match: ThreatIndicator | None,
        correlation: Any,
        notarize_blockchain: bool = False,
    ) -> tuple[RiskChangeEvent | None, RiskAlert | None]:
        """Recalculate deterministic risk and financial exposure for the affected asset."""
        # Find or create primary Risk record for this asset
        stmt = (
            select(Risk)
            .where(
                Risk.organization_id == self.organization_id,
                Risk.asset_id == asset.id,
            )
            .order_by(Risk.calculated_at.desc())
        )
        risk_row = (await self.db.scalars(stmt)).first()

        # Query active vulnerabilities for asset
        vulns_stmt = select(Vulnerability).where(
            Vulnerability.asset_id == asset.id,
            Vulnerability.remediation_status.in_([RemediationStatus.OPEN, RemediationStatus.IN_PROGRESS]),
        )
        active_vulns = list((await self.db.scalars(vulns_stmt)).all())

        # Determine highest exploitability
        max_exploitability = max((v.exploitability for v in active_vulns), default=0.3)
        crit_vuln_count = sum(1 for v in active_vulns if v.severity == Severity.CRITICAL or (v.cvss_score or 0) >= 9.0)

        # Base likelihood & impact & controls
        ctrl_stmt = select(Control).where(Control.organization_id == self.organization_id)
        controls = list((await self.db.scalars(ctrl_stmt)).all())
        control_eff = max((c.effectiveness for c in controls), default=0.3)

        likelihood = 0.6 if crit_vuln_count > 0 else 0.4
        impact = min(1.0, 0.4 + (asset.criticality * 0.12))

        # Adjust for event signals
        if event.event_type in (EventType.MALWARE_DETECTED.value, EventType.ENDPOINT_ALERT.value):
            likelihood = min(1.0, likelihood + 0.35)
            max_exploitability = max(max_exploitability, 0.90)
            control_eff = max(0.05, control_eff - 0.20)
        elif event.event_type == EventType.VULNERABILITY_FOUND.value:
            cvss = float((event.normalized_data or {}).get("cvss_score", 7.5))
            max_exploitability = max(max_exploitability, 0.90 if cvss >= 9.0 else 0.65)
            likelihood = min(1.0, likelihood + 0.25)
        elif event.event_type == EventType.MFA_DISABLED.value:
            likelihood = min(1.0, likelihood + 0.25)
            max_exploitability = max(max_exploitability, 0.75)
            control_eff = max(0.05, control_eff - 0.25)
        elif event.event_type in (EventType.AUTH_FAILURE.value, EventType.SUSPICIOUS_ACTIVITY.value):
            likelihood = min(1.0, likelihood + 0.15)
        elif event.event_type in (EventType.DATA_EXPOSURE.value, EventType.CLOUD_MISCONFIGURATION.value):
            asset.exposure = "internet"
            likelihood = min(1.0, likelihood + 0.20)
            max_exploitability = max(max_exploitability, 0.75)

        if event.severity == EventSeverity.CRITICAL.value:
            max_exploitability = max(max_exploitability, 0.90)
            likelihood = max(likelihood, 0.80)
            control_eff = max(0.05, control_eff - 0.15)

        if threat_match:
            likelihood = min(1.0, likelihood + 0.20)
            max_exploitability = max(max_exploitability, 0.85)

        if correlation and correlation.is_correlated:
            likelihood = min(1.0, likelihood + 0.15)
            impact = min(1.0, impact + 0.10)
            max_exploitability = max(max_exploitability, 0.90)

        # Quantify risk via existing authoritative risk engine
        risk_result = quantify_risk(
            likelihood=round(likelihood, 2),
            impact=round(impact, 2),
            criticality=asset.criticality,
            exploitability=round(max_exploitability, 2),
            control_effectiveness=round(control_eff, 2),
            exposure=asset.exposure,
            threat_likelihood=round(threat_match.confidence if threat_match else 0.4, 2),
            data_sensitivity=asset.data_sensitivity,
        )

        previous_score = risk_row.residual_risk if risk_row else 50.0
        new_score = round(risk_result.residual_risk, 2)
        score_delta = round(new_score - previous_score, 2)

        # Recalculate financial exposure & EAL
        fin_calc = calculate_eal(
            likelihood=likelihood,
            asset_business_value=float(asset.business_value or 5_000_000),
            impact=impact,
        )
        new_eal = float(fin_calc["estimated_annual_loss"])
        previous_eal = float(risk_row.expected_annual_loss) if risk_row else float(new_eal * 0.8)
        eal_delta = round(new_eal - previous_eal, 2)

        # Update or create Risk row
        now = datetime.now(timezone.utc)
        if risk_row:
            risk_row.likelihood = likelihood
            risk_row.impact = impact
            risk_row.risk_score = risk_result.inherent_risk
            risk_row.residual_risk = new_score
            risk_row.expected_annual_loss = new_eal
            risk_row.financial_exposure = float(asset.business_value or 5_000_000) * impact
            risk_row.calculated_at = now
            risk_row.drivers = risk_result.drivers
            risk_row.factors = factor_dicts(risk_result)
            risk_row.formula_trace = risk_result.formula_trace
            risk_row.explanation = f"Continuously updated via {event.source} ({event.event_type})."
        else:
            risk_row = Risk(
                organization_id=self.organization_id,
                asset_id=asset.id,
                likelihood=likelihood,
                impact=impact,
                risk_score=risk_result.inherent_risk,
                residual_risk=new_score,
                expected_annual_loss=new_eal,
                financial_exposure=float(asset.business_value or 5_000_000) * impact,
                calculated_at=now,
                drivers=risk_result.drivers,
                factors=factor_dicts(risk_result),
                formula_trace=risk_result.formula_trace,
                explanation=f"Initial continuous risk score from {event.source} telemetry.",
            )
            self.db.add(risk_row)
        await self.db.flush()

        # Update FinancialRisk table if exists
        fin_stmt = select(FinancialRisk).where(
            FinancialRisk.organization_id == self.organization_id,
            FinancialRisk.risk_id == risk_row.id,
        )
        fin_row = (await self.db.scalars(fin_stmt)).first()
        if fin_row:
            fin_row.expected_loss = new_eal
            fin_row.annualized_loss = new_eal
            fin_row.min_loss = float(fin_calc["probable_minimum_loss"])
            fin_row.max_loss = float(fin_calc["probable_maximum_loss"])
        else:
            fin_row = FinancialRisk(
                organization_id=self.organization_id,
                risk_id=risk_row.id,
                expected_loss=new_eal,
                annualized_loss=new_eal,
                min_loss=float(fin_calc["probable_minimum_loss"]),
                max_loss=float(fin_calc["probable_maximum_loss"]),
                confidence_level=0.8,
            )
            self.db.add(fin_row)
        await self.db.flush()

        # Build Explainable Reason
        reasons = [event.description]
        if threat_match:
            reasons.append(f"Active threat intelligence hit on IoC {threat_match.indicator}")
        if correlation and correlation.is_correlated:
            reasons.append(correlation.reason)
        full_reason = " | ".join(reasons)

        # 9. Create RiskChangeEvent
        risk_change = RiskChangeEvent(
            organization_id=self.organization_id,
            asset_id=asset.id,
            previous_score=previous_score,
            new_score=new_score,
            score_delta=score_delta,
            previous_eal=previous_eal,
            new_eal=new_eal,
            eal_delta=eal_delta,
            reason=full_reason[:1000],
            source_event_id=event.id,
        )
        self.db.add(risk_change)
        await self.db.flush()

        # Optional Blockchain Evidence Notarization
        if notarize_blockchain or abs(score_delta) >= 8.0 or new_score >= 80.0:
            try:
                evidence_payload = (
                    f"RiskChangeEvent: asset={asset.id}, prev={previous_score}, "
                    f"new={new_score}, delta={score_delta}, eal_delta={eal_delta}, "
                    f"reason='{full_reason}', timestamp={now.isoformat()}"
                )
                evidence = await record_evidence(
                    self.db,
                    organization_id=self.organization_id,
                    evidence_type="CONTINUOUS_RISK_CHANGE",
                    entity_id=risk_change.id,
                    payload=evidence_payload,
                )
                risk_change.blockchain_evidence_id = evidence.id
                await self.db.flush()
            except Exception as exc:
                log.debug("Blockchain notarization skipped: %s", exc)

        # 10. Generate RiskAlert if critical or high jump
        alert = None
        if score_delta >= 5.0 or new_score >= 75.0 or event.severity == EventSeverity.CRITICAL.value:
            alert_sev = "CRITICAL" if new_score >= 80.0 or score_delta >= 10.0 else "HIGH"
            alert = RiskAlert(
                organization_id=self.organization_id,
                severity=alert_sev,
                title=f"{event.event_type}: {asset.name} Risk Shift (+{score_delta})",
                description=f"{full_reason}. Financial exposure increased by ₹{round(eal_delta / 100_000, 2)}L.",
                asset_id=asset.id,
                risk_change=score_delta,
                financial_impact=eal_delta,
                status="OPEN",
                source_event_id=event.id,
            )
            self.db.add(alert)
            await self.db.flush()

        return risk_change, alert
