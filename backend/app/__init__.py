"""
app/__init__.py
Application Factory de ClinicTec.
Crea y configura la instancia Flask con todos sus blueprints y extensiones.
"""

from flask import Flask
from .config import Config, TestingConfig
from .extensions import db, migrate, cors


def create_app(config_class=Config):
    """Crea y devuelve la aplicación Flask configurada."""
    app = Flask(__name__)
    app.config.from_object(config_class)

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
    from .blueprints.pacientes import pacientes_bp
    from .blueprints.medicos   import medicos_bp
    from .blueprints.usuarios  import usuarios_bp
    app.register_blueprint(health_bp,    url_prefix="/api/health")
    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(pacientes_bp, url_prefix="/api/pacientes")
    app.register_blueprint(medicos_bp,   url_prefix="/api/medicos")
    app.register_blueprint(usuarios_bp,  url_prefix="/api/usuarios")

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
