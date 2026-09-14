import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_vulnerability_and_control_crud(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    asset = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={"name": "IdP", "asset_type": "identity", "criticality": 5, "business_value": 9800000},
    )
    asset_id = asset.json()["data"]["id"]

    vuln = await client.post(
        "/api/v1/vulnerabilities",
        headers=headers,
        json={
            "asset_id": asset_id,
            "cve_id": "CVE-2024-21887",
            "title": "Auth bypass",
            "cvss_score": 9.1,
            "exploitability": 0.9,
            "severity": "critical",
        },
    )
    assert vuln.status_code == 201
    listed = await client.get("/api/v1/vulnerabilities?severity=critical", headers=headers)
    assert listed.json()["total"] == 1

    control = await client.post(
        "/api/v1/controls",
        headers=headers,
        json={
            "name": "Privileged MFA",
            "framework": "NIST CSF",
            "category": "identity",
            "effectiveness": 0.72,
            "implementation_status": "partial",
            "annual_cost": 1200000,
        },
    )
    assert control.status_code == 201
    assert control.json()["data"]["framework"] == "NIST CSF"
