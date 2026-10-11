"""
app/utils/auth_decorators.py
Decoradores de autenticación y autorización para los blueprints de ClinicTec.

Estrategia de transporte del token:
  El cliente envía el token en la cabecera Authorization: Bearer <token>.
  No se usa localStorage para almacenar tokens de larga duración.
  El frontend (React SPA) guarda el access token en memoria (estado de React)
  y el refresh token en una cookie HttpOnly/Secure/SameSite=Strict.

  Ventajas frente a localStorage:
    - El access token en memoria desaparece al cerrar la pestaña.
    - El refresh token en cookie HttpOnly no es accesible desde JS.
  Limitaciones:
    - Los JWT son stateless; un token válido no puede "revocarse" por sí solo.
    - La revocación real requiere una lista de tokens invalidados (denylist)
      o tokens de corta duración con refresh controlado. Ver sección de logout.

Roles válidos: administrador | recepcion | medicos
El rol proviene de la BD (campo usuarios.rol), nunca de parámetros del cliente.
"""

import logging
from functools import wraps
from typing import Callable

import jwt
from flask import g, jsonify, request

from .security import decode_token
from ..extensions import db
from ..models.usuario import Usuario
from ..models.medico import Medico

log = logging.getLogger(__name__)

ROLES_VALIDOS = {"administrador", "recepcion", "medicos"}


# ── Helper interno ────────────────────────────────────────────────────────────

def _extract_token() -> str | None:
    """Extrae el Bearer token del header Authorization."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _error(mensaje: str, status: int):
    return jsonify({"data": None, "error": mensaje, "status": status}), status


# ── Decorador base: requiere token válido ────────────────────────────────────

def requiere_autenticacion(f: Callable) -> Callable:
    """
    Verifica que el request lleve un access token JWT válido.
    Si es válido, carga el usuario desde la BD y lo guarda en g.usuario_actual.
    Rechaza con 401 si el token falta, está vencido o es inválido.
    """
    @wraps(f)
    def decorado(*args, **kwargs):
        token = _extract_token()
        if not token:
            return _error("Token de autenticación requerido.", 401)

        try:
            payload = decode_token(token, expected_type="access")
        except jwt.ExpiredSignatureError:
            return _error("La sesión ha expirado. Inicia sesión nuevamente.", 401)
        except jwt.InvalidTokenError:
            return _error("Token inválido.", 401)

        # Cargar usuario desde la BD para obtener el rol actual
        # (no confiamos únicamente en el rol del token — puede haber cambiado)
        # expire_on_commit=True es el default, pero usamos with_for_update=False
        # para asegurar que leemos el valor más reciente.
        usuario_id = payload.get("sub")
        db.session.expire_all()   # invalida el cache de la sesión actual
        usuario = db.session.get(Usuario, int(usuario_id))

        if not usuario:
            return _error("Cuenta de usuario no encontrada.", 401)

        # Verificar que el rol del token coincide con el rol en BD
        # Si el admin cambió el rol, el token antiguo queda ineficaz.
        if payload.get("rol") != usuario.rol:
            return _error("Privilegios revocados. Inicia sesión nuevamente.", 401)

        g.usuario_actual = usuario
        g.token_payload  = payload
        return f(*args, **kwargs)

    return decorado


# ── Decorador de rol ─────────────────────────────────────────────────────────

def requiere_rol(*roles: str) -> Callable:
    """
    Verifica que el usuario autenticado tenga uno de los roles indicados.
    Debe usarse DESPUÉS de @requiere_autenticacion.

    Uso:
        @bp.get("/ruta")
        @requiere_autenticacion
        @requiere_rol("administrador", "recepcion")
        def mi_vista():
            ...
    """
    def decorador(f: Callable) -> Callable:
        @wraps(f)
        def decorado(*args, **kwargs):
            usuario: Usuario = getattr(g, "usuario_actual", None)
            if usuario is None:
                return _error("No autenticado.", 401)
            if usuario.rol not in roles:
                return _error(
                    f"Acceso denegado. Se requiere rol: {', '.join(roles)}.", 403
                )
            return f(*args, **kwargs)
        return decorado
    return decorador


# ── Decorador específico para médicos ────────────────────────────────────────

def requiere_perfil_medico(f: Callable) -> Callable:
    """
    Para endpoints del módulo médico:
    - Verifica que el usuario tenga rol 'medicos'.
    - Verifica que exista un perfil médico asociado en la tabla medicos.
    - Guarda el perfil en g.medico_actual para que los endpoints lo usen.
    - Nunca acepta id_medico enviado por el cliente.
    """
    @wraps(f)
    def decorado(*args, **kwargs):
        usuario: Usuario = getattr(g, "usuario_actual", None)
        if usuario is None:
            return _error("No autenticado.", 401)
        if usuario.rol != "medicos":
            return _error("Acceso denegado. Solo médicos.", 403)

        medico = db.session.execute(
            db.select(Medico).where(Medico.id_usuario == usuario.id_usuario)
        ).scalar_one_or_none()

        if medico is None:
            return _error(
                "No se encontró perfil médico asociado a esta cuenta. "
                "Contacta al administrador.", 403
            )

        if not medico.estado:
            return _error("El perfil médico está inactivo.", 403)

        g.medico_actual = medico
        return f(*args, **kwargs)

    return decorado
