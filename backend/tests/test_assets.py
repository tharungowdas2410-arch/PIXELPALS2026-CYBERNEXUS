import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_asset_crud_and_filters(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    created = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": "Internet-facing VPN",
            "asset_type": "network_device",
            "owner": "Network",
            "environment": "production",
            "criticality": 5,
            "business_value": 11200000,
            "exposure": "internet",
        },
    )
    assert created.status_code == 201
    asset_id = created.json()["data"]["id"]

    listed = await client.get("/api/v1/assets?search=VPN&criticality=5", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    fetched = await client.get(f"/api/v1/assets/{asset_id}", headers=headers)
    assert fetched.json()["data"]["name"] == "Internet-facing VPN"

    updated = await client.put(
        f"/api/v1/assets/{asset_id}",
        headers=headers,
        json={"owner": "Infrastructure"},
    )
    assert updated.json()["data"]["owner"] == "Infrastructure"

    deleted = await client.delete(f"/api/v1/assets/{asset_id}", headers=headers)
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_invalid_uuid(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    response = await client.get("/api/v1/assets/not-a-uuid", headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_foreign_org_isolation(client: AsyncClient) -> None:
    headers_a = await auth_headers(client, "a@example.com")
    created = await client.post(
        "/api/v1/assets",
        headers=headers_a,
        json={
            "name": "Secret DB",
            "asset_type": "database",
            "criticality": 5,
            "business_value": 1,
        },
    )
    asset_id = created.json()["data"]["id"]
    headers_b = await auth_headers(client, "b@example.com")
    missing = await client.get(f"/api/v1/assets/{asset_id}", headers=headers_b)
    assert missing.status_code == 404
