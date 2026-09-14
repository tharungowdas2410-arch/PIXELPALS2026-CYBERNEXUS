import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_register_login_me(client: AsyncClient) -> None:
    headers = await auth_headers(client)
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    body = me.json()["data"]
    assert body["email"] == "ciso@example.com"
    assert "password_hash" not in body


@pytest.mark.asyncio
async def test_login_rejects_bad_password(client: AsyncClient) -> None:
    await auth_headers(client)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "ciso@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthorized(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_email(client: AsyncClient) -> None:
    await auth_headers(client)
    again = await client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Other Org",
            "email": "ciso@example.com",
            "password": "ChangeMe_demo1!",
            "full_name": "Clone",
        },
    )
    assert again.status_code == 409
