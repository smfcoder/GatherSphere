import os
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import jwk, jwt

security = HTTPBearer(auto_error=False)
KEYCLOAK_ISSUER = os.environ.get(
    "KEYCLOAK_ISSUER",
    "http://localhost:8080/realms/society",
)
KEYCLOAK_AUDIENCE = os.environ.get("KEYCLOAK_AUDIENCE", "account")
SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key")
KNOWN_ROLES = {"admin", "user"}
JWKS_CACHE = None


async def get_jwks():
    global JWKS_CACHE
    if JWKS_CACHE is None:
        url = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/certs"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            JWKS_CACHE = resp.json()
    return JWKS_CACHE


def get_public_key(kid: str, jwks: dict):
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return jwk.construct(key)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unable to find matching public key",
    )


async def get_current_user(token=Depends(security)):
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
        )

    try:
        header = jwt.get_unverified_header(token.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )

    alg = header.get("alg", "RS256")
    kid = header.get("kid")

    try:
        if kid:
            jwks = await get_jwks()
            pub_key = get_public_key(kid, jwks)
            return jwt.decode(
                token.credentials,
                key=pub_key,
                algorithms=[alg],
                audience=KEYCLOAK_AUDIENCE,
                issuer=KEYCLOAK_ISSUER,
            )
    except HTTPException:
        raise
    except Exception:
        pass

    try:
        return jwt.decode(
            token.credentials,
            key=SECRET_KEY,
            algorithms=[alg],
            options={"verify_aud": False, "verify_iss": False},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def extract_roles(payload: dict) -> list[str]:
    realm_roles = payload.get("realm_access", {}).get("roles", [])
    resource_roles = []
    resource_access = payload.get("resource_access", {})
    if isinstance(resource_access, dict):
        for client_roles in resource_access.values():
            if isinstance(client_roles, dict):
                resource_roles.extend(client_roles.get("roles", []))
    return [r for r in set(realm_roles + resource_roles) if r in KNOWN_ROLES]


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, payload: dict = Depends(get_current_user)):
        roles = extract_roles(payload)
        if not any(role in roles for role in self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of the following roles: {', '.join(self.allowed_roles)}",
            )
        return payload


require_user = RoleChecker(["user", "admin"])
require_admin = RoleChecker(["admin"])
