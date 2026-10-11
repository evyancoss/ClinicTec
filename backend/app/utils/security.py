"""
app/utils/security.py
Utilidades de hashing de contraseñas y tokens JWT.

HASHING: Argon2id con parámetros OWASP (time_cost=2, memory_cost=65536, parallelism=2).
JWT:     HS256 firmado con JWT_SECRET_KEY de las variables de entorno.
         Los tokens llevan: sub, rol, iat, exp — sin contraseñas ni hashes.

Nunca se registran contraseñas, hashes ni el valor de JWT_SECRET_KEY.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

log = logging.getLogger(__name__)

# ── Configuración de Argon2id ─────────────────────────────────────────────────
# Parámetros mínimos OWASP 2023 para Argon2id:
#   time_cost    = 2   iteraciones
#   memory_cost  = 65536 KB (64 MB)
#   parallelism  = 2   hilos
_ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)

# ── Configuración JWT ─────────────────────────────────────────────────────────
_ALGORITHM = "HS256"
_ACCESS_MINUTES = int(os.environ.get("JWT_ACCESS_MINUTES", "60"))   # 1 hora
_REFRESH_DAYS   = int(os.environ.get("JWT_REFRESH_DAYS",   "7"))    # 7 días


def _secret() -> str:
    """Lee JWT_SECRET_KEY en cada llamada para soportar recarga en pruebas."""
    key = os.environ.get("JWT_SECRET_KEY", "")
    if not key:
        raise RuntimeError(
            "JWT_SECRET_KEY no está configurada. "
            "Agrégala a backend/.env antes de arrancar el servidor."
        )
    return key


# ── Hashing de contraseñas ────────────────────────────────────────────────────

def hash_password(plaintext: str) -> str:
    """Genera un hash Argon2id. Nunca registra el texto plano."""
    return _ph.hash(plaintext)


def verify_password(stored_hash: str, plaintext: str) -> bool:
    """
    Verifica una contraseña contra su hash.
    Devuelve False para cualquier error (hash inválido, formato desconocido, etc.)
    sin revelar el motivo exacto al llamador.
    """
    try:
        return _ph.verify(stored_hash, plaintext)
    except VerifyMismatchError:
        return False
    except (VerificationError, InvalidHashError) as exc:
        # Hash en formato desconocido o corrupto — no compatible con Argon2id.
        log.warning("Hash de contraseña en formato no compatible: %s", type(exc).__name__)
        return False


def needs_rehash(stored_hash: str) -> bool:
    """
    Retorna True si el hash fue creado con parámetros anteriores y
    debe regenerarse al próximo login exitoso.
    """
    try:
        return _ph.check_needs_rehash(stored_hash)
    except InvalidHashError:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(payload: dict) -> str:
    """
    Crea un access token JWT firmado con HS256.
    payload debe incluir al menos: sub (str), rol (str).
    No incluir contraseñas, hashes ni información clínica.
    """
    now = datetime.now(timezone.utc)
    data = {
        **payload,
        "iat": now,
        "exp": now + timedelta(minutes=_ACCESS_MINUTES),
        "type": "access",
    }
    return jwt.encode(data, _secret(), algorithm=_ALGORITHM)


def create_refresh_token(sub: str) -> str:
    """Crea un refresh token JWT (solo contiene sub)."""
    now = datetime.now(timezone.utc)
    data = {
        "sub": sub,
        "iat": now,
        "exp": now + timedelta(days=_REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(data, _secret(), algorithm=_ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> dict:
    """
    Decodifica y valida un token JWT.

    Valida: firma, algoritmo (solo HS256), expiración y tipo.
    Lanza jwt.PyJWTError en cualquier caso inválido.
    """
    try:
        payload = jwt.decode(
            token,
            _secret(),
            algorithms=[_ALGORITHM],   # lista explícita — rechaza alg=none
        )
    except jwt.ExpiredSignatureError:
        raise jwt.ExpiredSignatureError("Token expirado.")
    except jwt.InvalidTokenError as exc:
        raise jwt.InvalidTokenError(f"Token inválido: {type(exc).__name__}") from exc

    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(
            f"Tipo de token incorrecto: se esperaba '{expected_type}'."
        )
    return payload
