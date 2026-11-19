from dataclasses import dataclass

import jwt

from . import config


@dataclass(frozen=True)
class AuthenticatedProfessional:
    id: str
    name: str
    registry_type: str
    registry_number: str
    role: str
    token: str


class InvalidToken(Exception):
    pass


_public_key: str | None = None


def _load_public_key() -> str:
    """Read on first use, so this service can start before the identity service creates the key."""
    global _public_key
    if _public_key is None:
        try:
            _public_key = config.JWT_PUBLIC_KEY_PATH.read_text(encoding="utf-8")
        except FileNotFoundError as error:
            raise InvalidToken(f"Public key not found at {config.JWT_PUBLIC_KEY_PATH.resolve()}") from error
    return _public_key


def verify(token: str) -> AuthenticatedProfessional:
    """Checks an RS256 token issued by the identity service (signature, expiry and issuer)."""
    try:
        claims = jwt.decode(
            token,
            _load_public_key(),
            algorithms=["RS256"],
            issuer=config.JWT_ISSUER,
            options={"require": ["exp", "sub", "iss"]},
        )
    except jwt.ExpiredSignatureError as error:
        raise InvalidToken("Token expired") from error
    except jwt.PyJWTError as error:
        raise InvalidToken("Invalid token") from error

    return AuthenticatedProfessional(
        id=claims["sub"],
        name=claims.get("name", ""),
        registry_type=claims.get("registryType", ""),
        registry_number=claims.get("registryNumber", ""),
        role=claims.get("role", ""),
        token=token,
    )
