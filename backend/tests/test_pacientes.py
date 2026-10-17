"""
tests/test_pacientes.py
Pruebas para los endpoints de pacientes.
SQLite en memoria — no toca Supabase.
"""

import pytest
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models.paciente import Paciente
from app.models.cita import Cita
from app.models.clinica import Clinica


# ── Fixtures locales ──────────────────────────────────────────────────────────

PACIENTE_VALIDO = {
    "nombre": "Juan",
    "ape_paterno": "García",
    "ape_materno": "López",
    "fecha_nacimiento": "1990-05-15",
    "sexo": "M",
    "telefono": "5551234567",
    "correo": "juan@ejemplo.com",
    "direccion": "Calle Falsa 123",
}
@pytest.fixture()
def paciente_en_bd(app):
    """Paciente real en SQLite para pruebas de lectura/edición."""
    with app.app_context():
        from datetime import date as _date
        p = Paciente(
            nombre="Ana", ape_paterno="Martínez", ape_materno="Ruiz",
            fecha_nacimiento=_date(1985, 3, 10), sexo="F",
            telefono="5559876543", estado=True,
        )
        db.session.add(p)
        db.session.commit()
        pid = p.id_paciente
        yield pid
        db.session.delete(db.session.get(Paciente, pid))
        db.session.commit()


@pytest.fixture()
def cita_medico_paciente(app, paciente_en_bd, usuario_medico, clinica_demo):
    """Cita que vincula al médico de prueba con el paciente."""
    with app.app_context():
        usuario, medico = usuario_medico
        c = Cita(
            id_paciente=paciente_en_bd,
            id_medico=medico.id_medico,
            id_clinica=clinica_demo.id_clinica,
            fecha=__import__('datetime').date(2026, 10, 10),
            hora=__import__('datetime').time(9, 0, 0),
            motivo="Consulta general",
            estado="Agendada",
        )
        db.session.add(c)
        db.session.commit()
        cid = c.id_cita
        yield cid
        db.session.delete(db.session.get(Cita, cid))
        db.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/pacientes — Listar
# ═══════════════════════════════════════════════════════════════════════════════

class TestListarPacientes:

    def test_recepcion_puede_listar(self, client, token_recepcion):
        resp = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "pacientes" in data["data"]
        assert "paginacion" in data["data"]

    def test_admin_puede_listar(self, client, token_admin):
        resp = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 200

    def test_medico_sin_citas_obtiene_lista_vacia(self, client, token_medico):
        resp = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 200

    def test_sin_token_rechazado(self, client):
        resp = client.get("/api/pacientes/")
        assert resp.status_code == 401

    def test_paginacion_por_defecto(self, client, token_recepcion):
        data = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).get_json()["data"]
        assert data["paginacion"]["pagina"] == 1
        assert data["paginacion"]["por_pagina"] == 20

    def test_paginacion_custom(self, client, token_recepcion):
        data = client.get("/api/pacientes/?pagina=2&por_pagina=5", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).get_json()["data"]
        assert data["paginacion"]["pagina"] == 2
        assert data["paginacion"]["por_pagina"] == 5

    def test_paginacion_invalida_retorna_422(self, client, token_recepcion):
        resp = client.get("/api/pacientes/?pagina=0", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422

    def test_busqueda_por_nombre(self, client, token_recepcion, paciente_en_bd):
        data = client.get("/api/pacientes/?busqueda=Martínez", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).get_json()["data"]
        nombres = [p["ape_paterno"] for p in data["pacientes"]]
        assert "Martínez" in nombres

    def test_busqueda_sin_resultados(self, client, token_recepcion):
        data = client.get("/api/pacientes/?busqueda=XyzNoExiste999", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).get_json()["data"]
        assert data["pacientes"] == []
        assert data["paginacion"]["total"] == 0

    def test_respuesta_no_filtra_info_sensible(self, client, token_recepcion):
        raw = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).data.decode()
        assert "contrasena" not in raw
        assert "argon2" not in raw.lower()
        data = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).get_json()["data"]
        assert all("fecha_registro" not in p and "estado" not in p
                   for p in data["pacientes"])

    def test_medico_solo_lista_pacientes_vinculados_y_datos_basicos(
        self, client, token_medico, paciente_en_bd, cita_medico_paciente
    ):
        data = client.get("/api/pacientes/", headers={
            "Authorization": f"Bearer {token_medico}"
        }).get_json()["data"]
        assert [p["id_paciente"] for p in data["pacientes"]] == [paciente_en_bd]
        paciente = data["pacientes"][0]
        assert "direccion" not in paciente
        assert "fecha_registro" not in paciente
        assert "estado" not in paciente

    def test_medico_detalle_no_expone_direccion_ni_estado(
        self, client, token_medico, paciente_en_bd, cita_medico_paciente
    ):
        data = client.get(f"/api/pacientes/{paciente_en_bd}", headers={
            "Authorization": f"Bearer {token_medico}"
        }).get_json()["data"]
        assert "direccion" not in data
        assert "estado" not in data
        assert "fecha_registro" not in data


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/pacientes — Crear
# ═══════════════════════════════════════════════════════════════════════════════

class TestCrearPaciente:

    def test_recepcion_puede_crear(self, client, token_recepcion):
        resp = client.post("/api/pacientes/", json=PACIENTE_VALIDO, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["nombre"] == "Juan"
        assert data["ape_paterno"] == "García"
        assert "id_paciente" in data

    def test_admin_puede_crear(self, client, token_admin):
        body = {**PACIENTE_VALIDO, "nombre": "Pedro", "correo": "pedro@test.com"}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 201

    def test_medico_no_puede_crear(self, client, token_medico):
        resp = client.post("/api/pacientes/", json=PACIENTE_VALIDO, headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

    def test_sin_token_rechazado(self, client):
        resp = client.post("/api/pacientes/", json=PACIENTE_VALIDO)
        assert resp.status_code == 401

    def test_sin_body_retorna_400(self, client, token_recepcion):
        resp = client.post("/api/pacientes/", content_type="application/json",
                           headers={"Authorization": f"Bearer {token_recepcion}"})
        assert resp.status_code == 400

    def test_nombre_requerido(self, client, token_recepcion):
        body = {**PACIENTE_VALIDO, "nombre": ""}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422

    def test_tipo_invalido_se_rechaza_sin_error_interno(self, client, token_recepcion):
        body = {**PACIENTE_VALIDO, "nombre": ["Juan"]}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422
        assert resp.get_json()["error"]

    def test_no_acepta_ids_arbitrarios_en_el_body(self, client, token_recepcion):
        resp = client.post("/api/pacientes/", json={
            **PACIENTE_VALIDO, "id_paciente": 123, "id_usuario": 456,
        }, headers={"Authorization": f"Bearer {token_recepcion}"})
        assert resp.status_code == 422

    def test_fecha_invalida(self, client, token_recepcion):
        body = {**PACIENTE_VALIDO, "fecha_nacimiento": "no-es-fecha"}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422

    def test_sexo_invalido(self, client, token_recepcion):
        body = {**PACIENTE_VALIDO, "sexo": "Desconocido"}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422

    @pytest.mark.parametrize("sexo", ["M", "F", "O"])
    def test_acepta_codigos_de_sexo_supabase(self, client, token_recepcion, sexo):
        body = {**PACIENTE_VALIDO, "sexo": sexo}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 201
        assert resp.get_json()["data"]["sexo"] == sexo

    def test_correo_invalido(self, client, token_recepcion):
        body = {**PACIENTE_VALIDO, "correo": "no-es-correo"}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422

    def test_telefono_invalido(self, client, token_recepcion):
        body = {**PACIENTE_VALIDO, "telefono": "abc-no-num"}
        resp = client.post("/api/pacientes/", json=body, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 422

    def test_respuesta_no_expone_contrasena(self, client, token_recepcion):
        resp = client.post("/api/pacientes/", json=PACIENTE_VALIDO, headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert "contrasena" not in resp.data.decode()


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/pacientes/<id> — Detalle
# ═══════════════════════════════════════════════════════════════════════════════

def test_integrity_error_registra_metadatos_seguros_y_revierte(
    app, client, token_recepcion, monkeypatch, caplog
):
    class DiagnosticoSimulado:
        constraint_name = "pacientes_restriccion_test"
        schema_name = "public"
        table_name = "pacientes"
        column_name = "id_paciente"

    class ErrorDriverSimulado(Exception):
        pgcode = "23505"
        diag = DiagnosticoSimulado()

    with app.app_context():
        sesion = db.session()
        rollback_real = sesion.rollback
        rollback_observado = []

        def rollback():
            rollback_observado.append(True)
            rollback_real()

        def commit_fallido():
            raise IntegrityError(
                "INSERT con dato sensible",
                {"nombre": "PACIENTE_PRIVADO"},
                ErrorDriverSimulado(),
            )

        monkeypatch.setattr(sesion, "commit", commit_fallido)
        monkeypatch.setattr(sesion, "rollback", rollback)

        with caplog.at_level("ERROR", logger="app.blueprints.pacientes"):
            resp = client.post(
                "/api/pacientes/",
                json=PACIENTE_VALIDO,
                headers={"Authorization": f"Bearer {token_recepcion}"},
            )

    assert resp.status_code == 500
    assert rollback_observado == [True]
    assert sesion.is_active
    assert "23505" not in resp.get_data(as_text=True)
    assert "PACIENTE_PRIVADO" not in caplog.text
    assert "dato sensible" not in caplog.text

    registro = next(
        record for record in caplog.records
        if record.name == "app.blueprints.pacientes"
        and hasattr(record, "constraint_name")
    )
    assert registro.sqlstate == "23505"
    assert registro.constraint_name == "pacientes_restriccion_test"
    assert registro.schema_name == "public"
    assert registro.table_name == "pacientes"
    assert registro.column_name == "id_paciente"


class TestObtenerPaciente:

    def test_recepcion_obtiene_paciente(self, client, token_recepcion, paciente_en_bd):
        resp = client.get(f"/api/pacientes/{paciente_en_bd}", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 200
        assert resp.get_json()["data"]["id_paciente"] == paciente_en_bd

    def test_admin_obtiene_paciente(self, client, token_admin, paciente_en_bd):
        resp = client.get(f"/api/pacientes/{paciente_en_bd}", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 200

    def test_medico_obtiene_su_paciente(self, client, token_medico,
                                        paciente_en_bd, cita_medico_paciente):
        resp = client.get(f"/api/pacientes/{paciente_en_bd}", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "direccion" not in data
        assert "estado" not in data

    def test_medico_no_puede_ver_paciente_ajeno(self, client, token_medico,
                                                 paciente_en_bd):
        # Sin cita que vincule al médico con el paciente → denegado
        resp = client.get(f"/api/pacientes/{paciente_en_bd}", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

    def test_medico_no_puede_distinguir_id_inexistente(self, client, token_medico):
        resp = client.get("/api/pacientes/999999", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

    def test_id_inexistente_retorna_404(self, client, token_recepcion):
        resp = client.get("/api/pacientes/999999", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 404

    def test_sin_token_rechazado(self, client, paciente_en_bd):
        resp = client.get(f"/api/pacientes/{paciente_en_bd}")
        assert resp.status_code == 401

    def test_manipulacion_id_en_url(self, client, token_medico, paciente_en_bd):
        """Médico envía id de paciente ajeno en la URL — debe rechazarse."""
        resp = client.get(f"/api/pacientes/{paciente_en_bd}", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        # Sin cita asociada → 403, no 200
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# PUT /api/pacientes/<id> — Editar
# ═══════════════════════════════════════════════════════════════════════════════

class TestEditarPaciente:

    def test_recepcion_edita_paciente(self, client, token_recepcion, paciente_en_bd):
        resp = client.put(f"/api/pacientes/{paciente_en_bd}", json={
            "nombre": "Ana", "ape_paterno": "Martínez", "ape_materno": "Ruiz",
            "fecha_nacimiento": "1985-03-10", "sexo": "F",
            "telefono": "5550000001",
        }, headers={"Authorization": f"Bearer {token_recepcion}"})
        assert resp.status_code == 200
        assert resp.get_json()["data"]["telefono"] == "5550000001"
        assert resp.get_json()["data"]["sexo"] == "F"

    def test_medico_no_puede_editar(self, client, token_medico, paciente_en_bd):
        resp = client.put(f"/api/pacientes/{paciente_en_bd}", json=PACIENTE_VALIDO,
                          headers={"Authorization": f"Bearer {token_medico}"})
        assert resp.status_code == 403

    def test_id_inexistente_retorna_404(self, client, token_recepcion):
        resp = client.put("/api/pacientes/999999", json=PACIENTE_VALIDO,
                          headers={"Authorization": f"Bearer {token_recepcion}"})
        assert resp.status_code == 404

    def test_datos_invalidos_retorna_422(self, client, token_recepcion, paciente_en_bd):
        resp = client.put(f"/api/pacientes/{paciente_en_bd}",
                          json={**PACIENTE_VALIDO, "sexo": "invalido"},
                          headers={"Authorization": f"Bearer {token_recepcion}"})
        assert resp.status_code == 422

    def test_sin_token_rechazado(self, client, paciente_en_bd):
        resp = client.put(f"/api/pacientes/{paciente_en_bd}", json=PACIENTE_VALIDO)
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/pacientes/<id>/historial
# ═══════════════════════════════════════════════════════════════════════════════

class TestHistorialPaciente:

    def test_recepcion_no_accede_a_datos_clinicos(
        self, client, token_recepcion, paciente_en_bd
    ):
        resp = client.get(f"/api/pacientes/{paciente_en_bd}/historial", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 403

    def test_medico_con_cita_accede_historial(self, client, token_medico,
                                               paciente_en_bd, cita_medico_paciente):
        resp = client.get(f"/api/pacientes/{paciente_en_bd}/historial", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 200

    def test_recepcion_no_puede_consultar_historial_incluso_si_no_existe(
        self, client, token_recepcion
    ):
        resp = client.get("/api/pacientes/999999/historial", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 403
