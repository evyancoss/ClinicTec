"""
app/config.py
Configuración de la aplicación Flask por entorno.
Todas las credenciales se leen desde variables de entorno; nunca se codifican aquí.
"""

import os
import logging


def _require_env(key: str) -> str:
    """Lee una variable de entorno obligatoria; lanza ValueError si falta."""
    value = os.environ.get(key)
    if not value:
        raise ValueError(
            f"Variable de entorno requerida no configurada: {key}. "
            f"Copia backend/.env.example a backend/.env y completa los valores."
        )
    return value


class Config:
    """Configuración base (desarrollo)."""

    # ── Flask ────────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-cambia-en-produccion")
    DEBUG: bool = os.environ.get("FLASK_ENV", "development") == "development"

    # ── SQLAlchemy ───────────────────────────────────────────────────────────
    # DATABASE_URL es obligatoria para conectar a Supabase PostgreSQL.
    #
    # Opciones de conexión verificadas:
    #   Transaction pooler (puerto 6543) — el que funciona en este proyecto.
    #   Requiere prepared_statement_cache_size=0 porque el pooler no soporta
    #   prepared statements persistentes entre conexiones.
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL", "")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_size": 5,
        "max_overflow": 2,
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {
            "connect_timeout": 10,
            "sslmode": "require",
            "options": "-c statement_timeout=30000",
        },
    }

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # ── JWT ───────────────────────────────────────────────────────────────────
    # JWT_SECRET_KEY se lee directamente en utils/security.py desde os.environ
    # para permitir recarga en pruebas. No se expone aquí.
    JWT_ACCESS_MINUTES: int  = int(os.environ.get("JWT_ACCESS_MINUTES", "60"))
    JWT_REFRESH_DAYS:   int  = int(os.environ.get("JWT_REFRESH_DAYS",   "7"))

    # ── Logging ──────────────────────────────────────────────────────────────
    LOG_LEVEL: str = logging.DEBUG


class ProductionConfig(Config):
    """Configuración de producción."""
    DEBUG = False
    LOG_LEVEL = logging.WARNING
    SQLALCHEMY_DATABASE_URI: str = (
        _require_env("DATABASE_URL")
        if os.environ.get("FLASK_ENV") == "production"
        else Config.SQLALCHEMY_DATABASE_URI
    )


class TestingConfig(Config):
    """Pruebas automáticas — SQLite en memoria, nunca toca Supabase."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    CORS_ORIGINS = ["http://localhost:5173"]
    WTF_CSRF_ENABLED = False
    # JWT_SECRET_KEY para pruebas — se setea en conftest.py vía os.environ
