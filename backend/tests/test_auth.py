"""
tests/test_auth.py
Pruebas para los endpoints de autenticación y autorización.
Usan SQLite en memoria — no tocan Supabase ni datos clínicos reales.
"""

import json
import os
import time
import pytest
import jwt as pyjwt

from app.utils.security import hash_password, create_access_token, decode_token


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/auth/login
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogin:

    def test_login_correcto_admin(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["error"] is None
        assert "access_token" in data["data"]
        assert data["data"]["token_type"] == "Bearer"

    def test_login_devuelve_perfil(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        perfil = resp.get_json()["data"]["perfil"]
        assert perfil["rol"] == "administrador"
        assert perfil["usuario"] == "admin_test"
        assert "id_usuario" in perfil

    def test_login_no_expone_contrasena(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        raw = resp.data.decode()
        assert "contrasena" not in raw
        assert "argon2" not in raw.lower()
        assert "$2b$" not in raw

    def test_login_token_es_jwt_valido(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        token = resp.get_json()["data"]["access_token"]
        payload = decode_token(token, expected_type="access")
        assert payload["rol"] == "administrador"
        assert "exp" in payload
        assert "iat" in payload

    def test_login_token_contiene_sub(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        token = resp.get_json()["data"]["access_token"]
        payload = decode_token(token)
        assert payload["sub"] == str(usuario_admin.id_usuario)

    def test_login_usuario_incorrecto(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "no_existe",
            "contrasena": "ContraseñaSegura123!",
        })
        assert resp.status_code == 401
        data = resp.get_json()
        # Mensaje genérico — no revela si la cuenta existe
        assert "Credenciales inválidas" in data["error"]

    def test_login_contrasena_incorrecta(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaEquivocada999",
        })
        assert resp.status_code == 401
        data = resp.get_json()
        assert "Credenciales inválidas" in data["error"]

    def test_login_mismo_mensaje_usuario_inexistente_y_clave_erronea(
        self, client, usuario_admin
    ):
        """Prevención de enumeración: mismo mensaje para usuario inexistente y clave errónea."""
        r1 = client.post("/api/auth/login", json={
            "usuario": "no_existe",
            "contrasena": "cualquier_cosa",
        }).get_json()["error"]

        r2 = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "clave_erronea",
        }).get_json()["error"]

        assert r1 == r2

    def test_login_campos_vacios(self, client):
        resp = client.post("/api/auth/login", json={
            "usuario": "",
            "contrasena": "",
        })
        assert resp.status_code == 401

    def test_login_sin_body(self, client):
        resp = client.post("/api/auth/login", content_type="application/json")
        assert resp.status_code == 400

    def test_login_body_no_json(self, client):
        resp = client.post("/api/auth/login", data="no es json")
        assert resp.status_code == 400

    def test_login_recepcion(self, client, usuario_recepcion):
        resp = client.post("/api/auth/login", json={
            "usuario": "recep_test",
            "contrasena": "ContraseñaSegura123!",
        })
        assert resp.status_code == 200
        assert resp.get_json()["data"]["perfil"]["rol"] == "recepcion"

    def test_login_medico_incluye_id_medico(self, client, usuario_medico):
        resp = client.post("/api/auth/login", json={
            "usuario": "medico_test",
            "contrasena": "ContraseñaSegura123!",
        })
        assert resp.status_code == 200
        perfil = resp.get_json()["data"]["perfil"]
        assert "id_medico" in perfil
        assert "id_clinica" in perfil

    def test_login_establece_cookie_refresh(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        # La cookie debe existir (httponly — no accesible desde JS)
        assert "ct_refresh" in resp.headers.get("Set-Cookie", "")


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/auth/logout
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogout:

    def test_logout_devuelve_200(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200

    def test_logout_elimina_cookie(self, client, usuario_admin):
        # Login para obtener cookie
        client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        # Logout
        resp = client.post("/api/auth/logout")
        # La cookie debe estar eliminada (max-age=0 o expires pasado)
        cookie_header = resp.headers.get("Set-Cookie", "")
        assert "ct_refresh" in cookie_header
        assert "Max-Age=0" in cookie_header or "expires=" in cookie_header.lower()

    def test_logout_sin_cookie_funciona(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/auth/me
# ═══════════════════════════════════════════════════════════════════════════════

class TestMe:

    def test_me_con_token_valido(self, client, token_admin):
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["data"]["rol"] == "administrador"

    def test_me_sin_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_token_malformado(self, client):
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Bearer esto.no.es.un.jwt"
        })
        assert resp.status_code == 401

    def test_me_token_sin_firma(self, client, usuario_admin):
        """Rechaza tokens con alg=none (ataque de algoritmo nulo)."""
        # Construye manualmente un token con alg=none
        import base64
        header  = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=")
        payload = base64.urlsafe_b64encode(
            json.dumps({"sub": str(usuario_admin.id_usuario), "rol": "administrador",
                        "type": "access", "exp": 9999999999}).encode()
        ).rstrip(b"=")
        token_none = f"{header.decode()}.{payload.decode()}."

        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token_none}"
        })
        assert resp.status_code == 401

    def test_me_token_vencido(self, client, usuario_admin):
        """Genera un token ya vencido y verifica que se rechaza."""
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc) - timedelta(hours=2)
        token = pyjwt.encode(
            {
                "sub": str(usuario_admin.id_usuario),
                "rol": "administrador",
                "type": "access",
                "iat": now,
                "exp": now + timedelta(minutes=1),
            },
            os.environ["JWT_SECRET_KEY"],
            algorithm="HS256",
        )
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 401

    def test_me_token_alterado(self, client, token_admin):
        """Modifica un carácter del token — debe rechazarse."""
        partes = token_admin.split(".")
        # Alterar el payload
        partes[1] = partes[1][:-2] + "XX"
        token_alterado = ".".join(partes)
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token_alterado}"
        })
        assert resp.status_code == 401

    def test_me_no_expone_contrasena(self, client, token_admin):
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        raw = resp.data.decode()
        assert "contrasena" not in raw
        assert "argon2" not in raw.lower()

    def test_me_rol_revocado_invalida_token(self, client, app, usuario_recepcion, token_recepcion):
        """Si el rol cambia en BD, el token antiguo debe rechazarse."""
        from app.extensions import db
        from app.models.usuario import Usuario as U
        with app.app_context():
            u = db.session.get(U, usuario_recepcion.id_usuario)
            if u:
                u.rol = "administrador"
                db.session.commit()
                db.session.expire_all()   # fuerza recarga en próxima lectura

        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        # El token tiene rol="recepcion" pero la BD dice "administrador" → rechazado
        assert resp.status_code == 401

        # Restaurar rol
        with app.app_context():
            from app.extensions import db as db2
            u = db2.session.get(U, usuario_recepcion.id_usuario)
            if u:
                u.rol = "recepcion"
                db2.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# Decoradores de autorización
# ═══════════════════════════════════════════════════════════════════════════════

class TestAutorizacion:
    """Verifica los decoradores usando las rutas registradas en TestingConfig."""

    # ── Acceso autenticado ────────────────────────────────────────────────────

    def test_autenticado_accede(self, client, token_admin):
        resp = client.get("/prueba/solo-autenticado", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 200

    def test_sin_token_rechazado(self, client):
        resp = client.get("/prueba/solo-autenticado")
        assert resp.status_code == 401

    # ── Rol administrador ─────────────────────────────────────────────────────

    def test_admin_accede_a_ruta_admin(self, client, token_admin):
        resp = client.get("/prueba/solo-admin", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 200

    def test_recepcion_rechazado_en_ruta_admin(self, client, token_recepcion):
        resp = client.get("/prueba/solo-admin", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 403

    def test_medico_rechazado_en_ruta_admin(self, client, token_medico):
        resp = client.get("/prueba/solo-admin", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

    # ── Rol recepción ─────────────────────────────────────────────────────────

    def test_recepcion_accede_a_ruta_admin_o_recepcion(self, client, token_recepcion):
        resp = client.get("/prueba/admin-o-recepcion", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 200

    def test_medico_rechazado_en_ruta_admin_o_recepcion(self, client, token_medico):
        resp = client.get("/prueba/admin-o-recepcion", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

    # ── Rol médico con perfil ─────────────────────────────────────────────────

    def test_medico_accede_a_ruta_medico(self, client, token_medico):
        resp = client.get("/prueba/solo-medico", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 200
        assert "id_medico" in resp.get_json()

    def test_admin_rechazado_en_ruta_medico(self, client, token_admin):
        resp = client.get("/prueba/solo-medico", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 403

    # ── Médico sin perfil ─────────────────────────────────────────────────────

    def test_medico_sin_perfil_rechazado(self, client, app, usuario_medico_sin_perfil):
        from app.utils.security import create_access_token
        with app.app_context():
            token = create_access_token({
                "sub": str(usuario_medico_sin_perfil.id_usuario),
                "rol": "medicos",
            })
        resp = client.get("/prueba/solo-medico", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 403
        assert "perfil médico" in resp.get_json()["error"]


# ═══════════════════════════════════════════════════════════════════════════════
# Seguridad de hashing
# ═══════════════════════════════════════════════════════════════════════════════

class TestHashing:

    def test_hash_no_texto_plano(self):
        h = hash_password("mi-clave-secreta")
        assert "mi-clave-secreta" not in h

    def test_hash_empieza_con_argon2(self):
        h = hash_password("mi-clave-secreta")
        assert h.startswith("$argon2")

    def test_hash_diferente_cada_vez(self):
        """Salt aleatorio: dos hashes de la misma clave deben ser distintos."""
        h1 = hash_password("misma-clave")
        h2 = hash_password("misma-clave")
        assert h1 != h2

    def test_verify_correcto(self):
        from app.utils.security import verify_password
        h = hash_password("clave-de-prueba")
        assert verify_password(h, "clave-de-prueba") is True

    def test_verify_incorrecto(self):
        from app.utils.security import verify_password
        h = hash_password("clave-correcta")
        assert verify_password(h, "clave-incorrecta") is False

    def test_verify_hash_formato_desconocido(self):
        """Hash en texto plano o formato no reconocido devuelve False sin lanzar excepción."""
        from app.utils.security import verify_password
        assert verify_password("texto_plano", "texto_plano") is False
        assert verify_password("sha256:abc123", "abc123") is False

    def test_login_hash_incompatible_rechazado(self, client, app):
        """Usuario con contraseña en texto plano NO puede autenticarse."""
        from app.extensions import db
        from app.models.usuario import Usuario
        with app.app_context():
            u = Usuario(
                nombre="Hash",
                ape_paterno="Incompatible",
                ape_materno="Test",
                rol="recepcion",
                usuario="hash_incompatible",
                contrasena="texto_plano_sin_hash",
            )
            db.session.add(u)
            db.session.commit()

        resp = client.post("/api/auth/login", json={
            "usuario": "hash_incompatible",
            "contrasena": "texto_plano_sin_hash",
        })
        assert resp.status_code == 401

        with app.app_context():
            from app.extensions import db as db2
            from app.models.usuario import Usuario as U2
            u = db2.session.execute(
                db2.select(U2).where(U2.usuario == "hash_incompatible")
            ).scalar_one_or_none()
            if u:
                db2.session.delete(u)
                db2.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# Sin secretos en respuestas
# ═══════════════════════════════════════════════════════════════════════════════

class TestSinSecretos:

    def test_login_no_expone_jwt_secret(self, client, usuario_admin):
        resp = client.post("/api/auth/login", json={
            "usuario": "admin_test",
            "contrasena": "ContraseñaSegura123!",
        })
        raw = resp.data.decode()
        assert os.environ.get("JWT_SECRET_KEY", "") not in raw

    def test_error_no_expone_stack_trace(self, client):
        resp = client.post("/api/auth/login", json={
            "usuario": "x" * 300,   # entrada exagerada
            "contrasena": "x" * 300,
        })
        raw = resp.data.decode()
        assert "Traceback" not in raw
        assert "File " not in raw
