import os
import httpx

KEYCLOAK_BASE = os.environ.get("KEYCLOAK_BASE_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "society")
KEYCLOAK_ADMIN_USER = os.environ.get("KEYCLOAK_ADMIN_USERNAME", "admin")
KEYCLOAK_ADMIN_PASS = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")


async def get_admin_token() -> str:
    url = f"{KEYCLOAK_BASE}/realms/master/protocol/openid-connect/token"
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            url,
            data={
                "client_id": "admin-cli",
                "username": KEYCLOAK_ADMIN_USER,
                "password": KEYCLOAK_ADMIN_PASS,
                "grant_type": "password",
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def create_keycloak_user(username: str, email: str, password: str, roles: list[str] | None = None):
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    url = f"{KEYCLOAK_BASE}/admin/realms/{KEYCLOAK_REALM}/users"
    payload = {
        "username": username,
        "email": email,
        "emailVerified": True,
        "enabled": True,
        "credentials": [{"type": "password", "value": password, "temporary": False}],
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

        location = resp.headers.get("Location", "")
        user_id = location.rstrip("/").rsplit("/", 1)[-1] if location else ""

        if roles and user_id:
            roles_url = f"{KEYCLOAK_BASE}/admin/realms/{KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm"
            available_url = f"{KEYCLOAK_BASE}/admin/realms/{KEYCLOAK_REALM}/roles"
            avail_resp = await client.get(available_url, headers=headers)
            if avail_resp.status_code == 200:
                all_roles = avail_resp.json()
                role_refs = [r for r in all_roles if r.get("name") in roles]
                if role_refs:
                    await client.post(roles_url, json=role_refs, headers=headers)

        return user_id


async def delete_keycloak_user(keycloak_id: str):
    token = await get_admin_token()
    url = f"{KEYCLOAK_BASE}/admin/realms/{KEYCLOAK_REALM}/users/{keycloak_id}"

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.delete(url, headers={"Authorization": f"Bearer {token}"})
        resp.raise_for_status()


async def find_keycloak_user_by_email(email: str) -> str | None:
    token = await get_admin_token()
    url = f"{KEYCLOAK_BASE}/admin/realms/{KEYCLOAK_REALM}/users?email={email}"

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.status_code == 200:
            users = resp.json()
            if users:
                return users[0]["id"]
    return None
