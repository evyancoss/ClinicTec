"""
app/blueprints/auth.py

POST /api/auth/login   — autenticación con usuario + contraseña
POST /api/auth/logout  — invalidación de sesión en el cliente
GET  /api/auth/me      — perfil del usuario autenticado

Estrategia de tokens:
  - Access token (JWT HS256, 1 h) → enviado en JSON al cliente.
    El cliente lo guarda en memoria React (no en localStorage).
  - Refresh token (JWT HS256, 7 d) → enviado en cookie HttpOnly/Secure/SameSite=Strict.
    No accesible desde JavaScript.

Logout:
  Los JWT son stateless; el servidor no puede "revocar" un token sin una denylist.
  En esta fase, el logout elimina la cookie de refresh y el cliente descarta el
  access token en memoria. El access token expira en 1 hora por sí solo.
  Si se requiere revocación inmediata (ej. cuenta comprometida), el admin puede
  cambiar el JWT_SECRET_KEY (invalida TODOS los tokens) o implementar una
  denylist en Redis/BD en una fase posterior.

Contraseñas:
  La tabla usuarios está vacía. Todas las contraseñas se hashean con Argon2id.
  Si en el futuro se detectan contraseñas en texto plano, se detendrá el proceso
  y se documentará el procedimiento de migración segura.
"""

import logging
from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models.usuario import Usuario
from ..models.medico import Medico
from ..utils.security import (
    verify_password,
    needs_rehash,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from ..utils.auth_decorators import requiere_autenticacion
from ..schemas.responses import ok, error as err

log = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

# ── Configuración de la cookie de refresh ────────────────────────────────────
_COOKIE_NAME     = "ct_refresh"
_COOKIE_HTTPONLY = True
_COOKIE_SAMESITE = "Strict"
_COOKIE_MAX_AGE  = 60 * 60 * 24 * 7   # 7 días en segundos


def _set_refresh_cookie(response, token: str):
    """Adjunta el refresh token en una cookie HttpOnly."""
    import os
    secure = os.environ.get("FLASK_ENV", "development") != "development"
    response.set_cookie(
        _COOKIE_NAME,
        token,
        max_age=_COOKIE_MAX_AGE,
        httponly=_COOKIE_HTTPONLY,
        samesite=_COOKIE_SAMESITE,
        secure=secure,   # True en producción (HTTPS), False en desarrollo
        path="/api/auth",
    )
    return response


def _clear_refresh_cookie(response):
    """Elimina la cookie de refresh."""
    response.delete_cookie(_COOKIE_NAME, path="/api/auth")
    return response


def _build_perfil(usuario: Usuario) -> dict:
    """Construye el perfil público del usuario. Nunca incluye la contraseña."""
    perfil = usuario.to_dict()
    # Para médicos, adjuntar id_medico e id_clinica (resueltos desde BD)
    if usuario.rol == "medicos":
        medico = db.session.execute(
            db.select(Medico).where(Medico.id_usuario == usuario.id_usuario)
        ).scalar_one_or_none()
        if medico:
            perfil["id_medico"]  = medico.id_medico
            perfil["id_clinica"] = medico.id_clinica
    return perfil


# ── POST /api/auth/login ──────────────────────────────────────────────────────

@auth_bp.post("/login")
def login():
    """
    Cuerpo JSON esperado: { "usuario": "...", "contrasena": "..." }
    El campo de login es `usuario` (no correo), según el esquema real.
    """
    body = request.get_json(silent=True)
    if not body:
        return err("Se requiere un cuerpo JSON.", 400)

    nombre_usuario = (body.get("usuario") or "").strip()
    contrasena     = body.get("contrasena") or ""

    # Validación mínima de campos — mensajes genéricos para no filtrar información
    if not nombre_usuario or not contrasena:
        return err("Credenciales inválidas.", 401)

    # Buscar usuario por nombre de usuario
    usuario = db.session.execute(
        db.select(Usuario).where(Usuario.usuario == nombre_usuario)
    ).scalar_one_or_none()

    # Misma respuesta si el usuario no existe o la contraseña es incorrecta
    # (previene enumeración de cuentas)
    if usuario is None or not verify_password(usuario.contrasena, contrasena):
        # Tiempo constante — aunque el usuario no exista ejecutamos verify_password
        # con un hash dummy para evitar timing attacks por ausencia de usuario.
        if usuario is None:
            verify_password(
                "$argon2id$v=19$m=65536,t=2,p=2$dummy$dummy",
                contrasena,
            )
        log.info("Intento de login fallido para usuario: [REDACTADO]")
        return err("Credenciales inválidas.", 401)

    # Re-hashear si los parámetros de Argon2 cambiaron (upgrade transparente)
    if needs_rehash(usuario.contrasena):
        try:
            usuario.contrasena = hash_password(contrasena)
            db.session.commit()
            log.info("Contraseña rehashed para usuario id=%s", usuario.id_usuario)
        except Exception:
            db.session.rollback()

    # Construir tokens
    token_payload = {
        "sub": str(usuario.id_usuario),
        "rol": usuario.rol,
    }
    access_token  = create_access_token(token_payload)
    refresh_token = create_refresh_token(str(usuario.id_usuario))

    perfil = _build_perfil(usuario)

    response = jsonify({
        "data": {
            "access_token": access_token,
            "token_type":   "Bearer",
            "perfil":       perfil,
        },
        "error":  None,
        "status": 200,
    })
    _set_refresh_cookie(response, refresh_token)
    return response, 200


# ── POST /api/auth/logout ─────────────────────────────────────────────────────

@auth_bp.post("/logout")
def logout():
    """
    Elimina la cookie de refresh del servidor.
    El cliente debe descartar el access token en memoria.

    Limitación conocida: el access token sigue siendo válido hasta su
    expiración (1 h). Para revocación inmediata se requiere una denylist
    (implementación en fase posterior si el requisito es crítico).
    """
    response = jsonify({
        "data":   {"mensaje": "Sesión cerrada."},
        "error":  None,
        "status": 200,
    })
    _clear_refresh_cookie(response)
    return response, 200


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@auth_bp.get("/me")
@requiere_autenticacion
def me():
    """
    Devuelve el perfil del usuario autenticado.
    Requiere token de acceso válido en Authorization: Bearer <token>.
    """
    perfil = _build_perfil(g.usuario_actual)
    return ok(perfil)


# ── POST /api/auth/refresh ────────────────────────────────────────────────────

@auth_bp.post("/refresh")
def refresh():
    """
    Genera un nuevo access token usando el refresh token de la cookie.
    No requiere contraseña.
    """
    import jwt as pyjwt

    token = request.cookies.get(_COOKIE_NAME)
    if not token:
        return err("Refresh token no encontrado.", 401)

    try:
        payload = decode_token(token, expected_type="refresh")
    except pyjwt.ExpiredSignatureError:
        return err("Sesión expirada. Inicia sesión nuevamente.", 401)
    except pyjwt.InvalidTokenError:
        return err("Token de refresco inválido.", 401)

    usuario = db.session.get(Usuario, int(payload["sub"]))
    if not usuario:
        return err("Cuenta no encontrada.", 401)

    new_access = create_access_token({"sub": str(usuario.id_usuario), "rol": usuario.rol})
    return ok({"access_token": new_access, "token_type": "Bearer"})
