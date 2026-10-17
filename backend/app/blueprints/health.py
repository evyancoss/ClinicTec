"""
app/blueprints/health.py
Endpoints de verificación de estado del servicio.

GET /api/health     → responde sin tocar la base de datos
GET /api/health/db  → ejecuta una consulta mínima SELECT 1 para verificar conectividad

Nunca devuelve credenciales, cadenas de conexión ni información sensible.
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from ..extensions import db

log = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.get("")
@health_bp.get("/")
def health_check():
    """
    Verificación básica de que Flask está en ejecución.
    No requiere base de datos.
    """
    return jsonify({
        "data": {
            "status": "ok",
            "service": "ClinicTec API",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "error": None,
        "status": 200,
    }), 200


@health_bp.get("/db")
def health_db():
    """
    Verifica la conectividad con PostgreSQL ejecutando SELECT 1.
    Informa si la conexión fue exitosa o muestra el tipo de error,
    sin exponer la cadena de conexión ni las credenciales.
    """
    try:
        with db.engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        return jsonify({
            "data": {
                "status": "ok",
                "database": "conectada",
                "dialect": db.engine.dialect.name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "error": None,
            "status": 200,
        }), 200

    except OperationalError as exc:
        # Error de red, credenciales incorrectas, host no disponible
        log.error("Error de conexión a la base de datos (%s).", _safe_error(exc))
        return jsonify({
            "data": None,
            "error": (
                "No se pudo conectar a la base de datos. "
                "Verifica que DATABASE_URL esté configurada correctamente en tu .env "
                "y que el host de Supabase esté accesible."
            ),
            "status": 503,
        }), 503

    except SQLAlchemyError as exc:
        log.error("Error SQLAlchemy (%s).", _safe_error(exc))
        return jsonify({
            "data": None,
            "error": "Error al consultar la base de datos.",
            "status": 500,
        }), 500


def _safe_error(exc: Exception) -> str:
    """
    Devuelve una representación del error sin incluir
    cadenas de conexión, contraseñas ni tokens.
    """
    return type(exc).__name__
