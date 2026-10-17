"""
app/__init__.py
Application Factory de ClinicTec.
Crea y configura la instancia Flask con todos sus blueprints y extensiones.
"""

from flask import Flask
from .config import Config, ProductionConfig, TestingConfig
from .extensions import db, migrate, cors


def create_app(config_class=None):
    """Crea y devuelve la aplicación Flask configurada."""
    if config_class is None:
        import os
        config_class = ProductionConfig if os.environ.get("FLASK_ENV") == "production" else Config
    app = Flask(__name__)
    app.config.from_object(config_class)
    if config_class is ProductionConfig:
        _validar_configuracion_produccion(app)

    # ── Inicializar extensiones ──────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,   # necesario para enviar cookies HttpOnly
    )

    # ── Importar modelos para que Flask-Migrate los detecte ─────────────────
    # (no se crean ni modifican tablas aquí)
    from . import models  # noqa: F401

    # ── Registrar blueprints ─────────────────────────────────────────────────
    from .blueprints.health    import health_bp
    from .blueprints.auth      import auth_bp
    from .blueprints.citas     import citas_bp
    from .blueprints.pacientes import pacientes_bp
    from .blueprints.consultas import consultas_bp
    from .blueprints.medicos   import medicos_bp
    from .blueprints.usuarios  import usuarios_bp
    from .blueprints.admin     import admin_bp
    from .blueprints.clinicas  import clinicas_bp
    app.register_blueprint(health_bp,    url_prefix="/api/health")
    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(citas_bp,     url_prefix="/api/citas")
    app.register_blueprint(pacientes_bp, url_prefix="/api/pacientes")
    app.register_blueprint(consultas_bp, url_prefix="/api")
    app.register_blueprint(medicos_bp,   url_prefix="/api/medicos")
    app.register_blueprint(usuarios_bp,  url_prefix="/api/usuarios")
    app.register_blueprint(admin_bp,     url_prefix="/api/admin")
    app.register_blueprint(clinicas_bp,  url_prefix="/api/clinicas")

    # ── Registrar comandos CLI ────────────────────────────────────────────────
    from .commands import register_commands
    register_commands(app)

    # ── Blueprint de pruebas (solo en testing) ────────────────────────────────
    if app.config.get("TESTING"):
        from .blueprints.prueba_auth import prueba_auth_bp
        app.register_blueprint(prueba_auth_bp)

    # ── Manejadores de error globales ────────────────────────────────────────
    _register_error_handlers(app)

    return app


def _validar_configuracion_produccion(app: Flask) -> None:
    """Falla al arrancar si el despliegue conserva claves o URLs de ejemplo."""
    import os

    required = ("SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_URL", "CORS_ORIGINS")
    missing = [key for key in required if not os.environ.get(key, "").strip()]
    if missing:
        raise RuntimeError("Faltan variables de producción requeridas: " + ", ".join(missing))
    for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = os.environ[key].strip()
        placeholder_markers = ("cambia_esto", "xxxxxxxx", "genera_", "aleatoria", "placeholder")
        if len(value) < 32 or any(marker in value.lower() for marker in placeholder_markers):
            raise RuntimeError(f"{key} debe ser una clave aleatoria de al menos 32 caracteres.")
    if os.environ["SECRET_KEY"].strip() == os.environ["JWT_SECRET_KEY"].strip():
        raise RuntimeError("SECRET_KEY y JWT_SECRET_KEY deben tener valores diferentes.")
    if not app.config.get("SQLALCHEMY_DATABASE_URI", "").startswith("postgresql"):
        raise RuntimeError("DATABASE_URL debe apuntar a PostgreSQL en producción.")
    if any(marker in app.config["SQLALCHEMY_DATABASE_URI"].upper() for marker in ("USUARIO", "CONTRASENA", "HOST:")):
        raise RuntimeError("DATABASE_URL todavía contiene valores de ejemplo.")
    if not app.config.get("CORS_ORIGINS") or any(
        not origin.startswith("https://") or "*" in origin
        for origin in app.config["CORS_ORIGINS"]
    ):
        raise RuntimeError("CORS_ORIGINS debe contener únicamente orígenes HTTPS explícitos del frontend.")
    try:
        clinic_id = int(os.environ["RECEPTION_CLINIC_ID"])
    except (KeyError, ValueError):
        raise RuntimeError("RECEPTION_CLINIC_ID debe identificar la clínica operativa.") from None
    if clinic_id < 1:
        raise RuntimeError("RECEPTION_CLINIC_ID debe ser un entero positivo.")


def _register_error_handlers(app: Flask) -> None:
    """Registra respuestas JSON consistentes para errores HTTP comunes."""
    from flask import jsonify

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"data": None, "error": "Solicitud incorrecta.", "status": 400}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"data": None, "error": "No autorizado.", "status": 401}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"data": None, "error": "Acceso denegado.", "status": 403}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"data": None, "error": "Recurso no encontrado.", "status": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"data": None, "error": "Método no permitido.", "status": 405}), 405

    @app.errorhandler(500)
    def internal_error(e):
        # No incluir el traceback completo en la respuesta
        app.logger.error("Error interno: %s", str(e))
        return jsonify({"data": None, "error": "Error interno del servidor.", "status": 500}), 500
