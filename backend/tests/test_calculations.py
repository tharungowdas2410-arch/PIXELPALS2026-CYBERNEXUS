from app.services.blockchain_service import hash_payload, verify_evidence
from app.utils.calculations import expected_annual_loss, inherent_risk, residual_risk, risk_level, rosi
from app.services.investment_optimizer import ControlOption, optimize_portfolio


def test_inherent_and_residual_risk() -> None:
    score = inherent_risk(likelihood=1, impact=1, criticality=5, exploitability=1)
    assert score == 100
    assert residual_risk(score, 0.5) == 50
    assert risk_level(82).value == "CRITICAL"
    assert inherent_risk(0, 1, 5, 1) == 0


def test_rosi_and_zero_cost() -> None:
    assert rosi(loss_avoided=2600000, investment_cost=1200000) == 116.67
    assert rosi(loss_avoided=100, investment_cost=0) is None


def test_eal() -> None:
    assert expected_annual_loss(0.4, 10_000_000) == 4_000_000


def test_optimizer_zero_budget() -> None:
    options = [
        ControlOption("mfa", "MFA", 12, 18, 26),
        ControlOption("edr", "EDR", 24, 12, 20),
    ]
    assert optimize_portfolio(0, options) == []
    picked = optimize_portfolio(12, options)
    assert [item.id for item in picked] == ["mfa"]


def test_blockchain_hash() -> None:
    digest = hash_payload("risk-assessment:path-vpn")
    assert len(digest) == 64
    assert verify_evidence("risk-assessment:path-vpn", digest)
    assert not verify_evidence("tampered", digest)
