"""
tests/conftest.py
Fixtures compartidas para todas las pruebas.
Usa TestingConfig con SQLite en memoria — nunca toca Supabase.
"""

import os
import pytest

# Establecer JWT_SECRET_KEY antes de importar la app
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-para-pruebas-unitarias-32chars!")
os.environ.setdefault("JWT_ACCESS_MINUTES", "60")
os.environ.setdefault("JWT_REFRESH_DAYS", "7")

from app import create_app
from app.config import TestingConfig
from app.extensions import db as _db
from app.models.usuario import Usuario
from app.models.medico import Medico
from app.models.clinica import Clinica
from app.utils.security import hash_password


@pytest.fixture(scope="session")
def app():
    """Crea la aplicación Flask en modo testing."""
    application = create_app(TestingConfig)
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture()
def client(app):
    """Cliente HTTP de prueba."""
    return app.test_client()


@pytest.fixture()
def app_ctx(app):
    """Contexto de aplicación para pruebas que lo necesiten explícitamente."""
    with app.app_context():
        yield app


# ── Fixtures de datos de prueba ───────────────────────────────────────────────

@pytest.fixture()
def clinica_demo(app):
    """Clínica de prueba. Se elimina al terminar el test."""
    with app.app_context():
        c = Clinica(nombre="Clínica Demo", direccion="Calle Test 1", estado=True)
        _db.session.add(c)
        _db.session.commit()
        yield c
        _db.session.delete(c)
        _db.session.commit()


@pytest.fixture()
def usuario_admin(app, clinica_demo):
    """Usuario administrador de prueba con contraseña hasheada."""
    with app.app_context():
        u = Usuario(
            nombre="Admin",
            ape_paterno="Test",
            ape_materno="Demo",
            rol="administrador",
            usuario="admin_test",
            contrasena=hash_password("ContraseñaSegura123!"),
        )
        _db.session.add(u)
        _db.session.commit()
        yield u
        _db.session.delete(u)
        _db.session.commit()


@pytest.fixture()
def usuario_recepcion(app, clinica_demo):
    """Usuario recepción de prueba."""
    with app.app_context():
        u = Usuario(
            nombre="Recep",
            ape_paterno="Test",
            ape_materno="Demo",
            rol="recepcion",
            usuario="recep_test",
            contrasena=hash_password("ContraseñaSegura123!"),
        )
        _db.session.add(u)
        _db.session.commit()
        yield u
        _db.session.delete(u)
        _db.session.commit()


@pytest.fixture()
def usuario_medico(app, clinica_demo):
    """Usuario médico con perfil asociado en tabla medicos."""
    with app.app_context():
        u = Usuario(
            nombre="Medico",
            ape_paterno="Test",
            ape_materno="Demo",
            rol="medicos",
            usuario="medico_test",
            contrasena=hash_password("ContraseñaSegura123!"),
        )
        _db.session.add(u)
        _db.session.flush()

        m = Medico(
            id_usuario=u.id_usuario,
            id_clinica=clinica_demo.id_clinica,
            nombre="Medico",
            ape_paterno="Test",
            ape_materno="Demo",
            especialidad="General",
            cedula_profesional="CED-TEST-001",
            estado=True,
        )
        _db.session.add(m)
        _db.session.commit()
        yield u, m
        _db.session.delete(m)
        _db.session.delete(u)
        _db.session.commit()


@pytest.fixture()
def usuario_medico_sin_perfil(app):
    """Usuario con rol médico pero sin perfil en tabla medicos."""
    with app.app_context():
        u = Usuario(
            nombre="Medico",
            ape_paterno="SinPerfil",
            ape_materno="Demo",
            rol="medicos",
            usuario="medico_sin_perfil",
            contrasena=hash_password("ContraseñaSegura123!"),
        )
        _db.session.add(u)
        _db.session.commit()
        yield u
        _db.session.delete(u)
        _db.session.commit()


@pytest.fixture()
def token_admin(app, usuario_admin):
    """Access token válido para el administrador de prueba."""
    from app.utils.security import create_access_token
    with app.app_context():
        return create_access_token({
            "sub": str(usuario_admin.id_usuario),
            "rol": usuario_admin.rol,
        })


@pytest.fixture()
def token_recepcion(app, usuario_recepcion):
    """Access token válido para recepción."""
    from app.utils.security import create_access_token
    with app.app_context():
        return create_access_token({
            "sub": str(usuario_recepcion.id_usuario),
            "rol": usuario_recepcion.rol,
        })


@pytest.fixture()
def token_medico(app, usuario_medico):
    """Access token válido para médico."""
    from app.utils.security import create_access_token
    with app.app_context():
        usuario, _ = usuario_medico
        return create_access_token({
            "sub": str(usuario.id_usuario),
            "rol": usuario.rol,
        })
