"""
tests/test_health.py
Pruebas para los endpoints GET /api/health y GET /api/health/db.
Usan SQLite en memoria; no requieren credenciales de Supabase.
"""

import json


class TestHealthCheck:
    """GET /api/health — respuesta sin base de datos."""

    def test_status_200(self, client):
        resp = client.get("/api/health/")
        assert resp.status_code == 200

    def test_content_type_json(self, client):
        resp = client.get("/api/health/")
        assert resp.content_type.startswith("application/json")

    def test_response_structure(self, client):
        data = json.loads(client.get("/api/health/").data)
        assert "data" in data
        assert "error" in data
        assert "status" in data

    def test_error_is_null(self, client):
        data = json.loads(client.get("/api/health/").data)
        assert data["error"] is None

    def test_status_field_is_200(self, client):
        data = json.loads(client.get("/api/health/").data)
        assert data["status"] == 200

    def test_service_name(self, client):
        data = json.loads(client.get("/api/health/").data)
        assert data["data"]["service"] == "ClinicTec API"

    def test_status_ok(self, client):
        data = json.loads(client.get("/api/health/").data)
        assert data["data"]["status"] == "ok"

    def test_timestamp_present(self, client):
        data = json.loads(client.get("/api/health/").data)
        assert "timestamp" in data["data"]
        assert data["data"]["timestamp"]  # no vacío

    def test_get_without_trailing_slash(self, client):
        resp = client.get("/api/health")
        assert resp.status_code in (200, 308)  # 308 redirect es aceptable


class TestHealthDb:
    """GET /api/health/db — verifica conectividad con la base de datos de testing."""

    def test_status_200_with_sqlite(self, client):
        # TestingConfig usa SQLite en memoria; siempre debe conectar.
        resp = client.get("/api/health/db")
        assert resp.status_code == 200

    def test_response_structure(self, client):
        data = json.loads(client.get("/api/health/db").data)
        assert "data" in data
        assert "error" in data
        assert "status" in data

    def test_database_connected(self, client):
        data = json.loads(client.get("/api/health/db").data)
        assert data["data"]["status"] == "ok"
        assert data["data"]["database"] == "conectada"

    def test_dialect_present(self, client):
        data = json.loads(client.get("/api/health/db").data)
        # En testing usa SQLite; en producción será postgresql
        assert data["data"]["dialect"] in ("sqlite", "postgresql")

    def test_no_credentials_in_response(self, client):
        """Garantiza que la respuesta no contenga información sensible."""
        raw = client.get("/api/health/db").data.decode()
        for term in ("password", "postgresql+psycopg2", "@", "SECRET_KEY"):
            assert term not in raw, f"La respuesta contiene texto sensible: {term}"


class TestAppFactory:
    """Verifica que la application factory funciona correctamente."""

    def test_app_is_not_none(self, app):
        assert app is not None

    def test_testing_flag(self, app):
        assert app.config["TESTING"] is True

    def test_sqlite_in_memory(self, app):
        assert "sqlite" in app.config["SQLALCHEMY_DATABASE_URI"]

    def test_health_blueprint_registered(self, app):
        rules = [str(r) for r in app.url_map.iter_rules()]
        assert any("/api/health" in r for r in rules)

    def test_404_returns_json(self, client):
        resp = client.get("/ruta-que-no-existe")
        assert resp.status_code == 404
        data = json.loads(resp.data)
        assert data["status"] == 404
        assert data["error"] is not None

    def test_debug_mode_in_testing(self, app):
        assert app.config["DEBUG"] is True
