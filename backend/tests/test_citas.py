"""Pruebas de lectura de agenda con SQLite en memoria."""

from datetime import date, time

import pytest

from app.extensions import db
from app.models.cita import Cita
from app.models.clinica import Clinica
from app.models.medico import Medico
from app.models.paciente import Paciente
from app.models.usuario import Usuario


def _nueva_cita(**overrides):
    return {
        "id_paciente": 1,
        "id_medico": 1,
        "fecha": "2026-10-19",
        "hora": "09:00",
        "motivo": "Consulta inicial",
    } | overrides


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def cita_demo(app, usuario_medico, clinica_demo):
    with app.app_context():
        _, medico = usuario_medico
        paciente = Paciente(
            nombre="Paciente",
            ape_paterno="Prueba",
            ape_materno="Agenda",
            fecha_nacimiento=date(1990, 1, 1),
            sexo="O",
            estado=True,
        )
        db.session.add(paciente)
        db.session.flush()
        cita = Cita(
            id_paciente=paciente.id_paciente,
            id_medico=medico.id_medico,
            id_clinica=clinica_demo.id_clinica,
            fecha=date(2026, 10, 17),
            hora=time(9, 30),
            motivo="Consulta de prueba",
            estado="Agendada",
        )
        db.session.add(cita)
        db.session.commit()
        ids = (cita.id_cita, paciente.id_paciente, medico.id_medico)
        yield ids
        db.session.delete(db.session.get(Cita, ids[0]))
        db.session.delete(db.session.get(Paciente, ids[1]))
        db.session.commit()


def test_listar_citas_recepcion_solo_fecha_y_clinica(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(
        app.config, "RECEPTION_CLINIC_ID", str(clinica_demo.id_clinica)
    )

    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert len(data["citas"]) == 1
    assert data["citas"][0]["id_cita"] == cita_demo[0]
    assert data["citas"][0]["estado"] == "Agendada"
    assert data["citas"][0]["hora"] == "09:30"
    assert data["paginacion"] == {
        "pagina": 1,
        "por_pagina": 20,
        "total": 1,
        "paginas": 1,
    }


def test_recepcion_no_ve_cita_de_medico_de_otra_clinica(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    with app.app_context():
        otra_clinica = Clinica(
            nombre="Otra Clínica", direccion="Dirección de prueba", estado=True
        )
        db.session.add(otra_clinica)
        db.session.flush()
        cita_cruzada = db.session.get(Cita, cita_demo[0])
        cita_cruzada.id_clinica = otra_clinica.id_clinica
        db.session.commit()
        id_otra_clinica = otra_clinica.id_clinica

    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", id_otra_clinica)
    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["citas"] == []

    with app.app_context():
        cita_cruzada = db.session.get(Cita, cita_demo[0])
        cita_cruzada.id_clinica = clinica_demo.id_clinica
        db.session.delete(db.session.get(Clinica, id_otra_clinica))
        db.session.commit()


def test_recepcion_sin_clinica_configurada_recibe_503(
    app, client, token_recepcion, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", None)

    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 503


@pytest.mark.parametrize("id_clinica", [True, 1.5, "no-es-id", "0"])
def test_recepcion_rechaza_configuracion_de_clinica_invalida(
    app, client, token_recepcion, monkeypatch, id_clinica
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", id_clinica)

    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 503


def test_recepcion_no_puede_consultar_clinica_inactiva(
    app, client, token_recepcion, clinica_demo, monkeypatch
):
    with app.app_context():
        clinica_demo.estado = False
        db.session.commit()
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)

    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 503


@pytest.mark.parametrize("fecha", ["", "17-10-2026", "2026-02-30"])
def test_fecha_ausente_o_invalida_retorna_422(client, token_recepcion, fecha):
    response = client.get(
        f"/api/citas/?fecha={fecha}",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 422


def test_paginacion_invalida_retorna_422(client, token_recepcion):
    response = client.get(
        "/api/citas/?fecha=2026-10-17&por_pagina=101",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 422


def test_medico_solo_lista_sus_citas(
    client, token_medico, cita_demo
):
    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_medico),
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert [cita["id_cita"] for cita in data["citas"]] == [cita_demo[0]]
    assert data["citas"][0]["id_medico"] == cita_demo[2]


@pytest.mark.parametrize("ruta", ["/api/citas", "/api/citas/"])
def test_recepcion_crea_cita_con_clinica_operativa_y_sin_duracion_persistida(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch, ruta
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    response = client.post(
        ruta,
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
        ),
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["id_clinica"] == clinica_demo.id_clinica
    assert data["estado"] == "Agendada"
    assert data["hora"] == "09:00"
    assert "duracion" not in data
    with app.app_context():
        cita = db.session.get(Cita, data["id_cita"])
        assert cita.id_clinica == clinica_demo.id_clinica
        db.session.delete(cita)
        db.session.commit()


def test_creacion_cita_rechaza_clinica_y_estado_enviados_por_cliente(
    client, token_recepcion, cita_demo
):
    for campo, valor in (("id_clinica", 999), ("estado", "Atendida")):
        response = client.post(
            "/api/citas/",
            json=_nueva_cita(
                id_paciente=cita_demo[1],
                id_medico=cita_demo[2],
                **{campo: valor},
            ),
            headers=_headers(token_recepcion),
        )
        assert response.status_code == 422


@pytest.mark.parametrize(
    ("cambios", "status"),
    [
        ({"id_paciente": 999999}, 404),
        ({"id_medico": 999999}, 404),
        ({"fecha": "2026-02-30"}, 422),
        ({"fecha": 20261019}, 422),
        ({"hora": "25:00"}, 422),
        ({"hora": "9:00"}, 422),
        ({"id_paciente": True}, 422),
        ({"id_medico": "1"}, 422),
        ({"motivo": "x" * 256}, 422),
    ],
)
def test_creacion_cita_rechaza_datos_invalidos(
    client, token_recepcion, cita_demo, cambios, status
):
    payload = _nueva_cita(
        id_paciente=cita_demo[1],
        id_medico=cita_demo[2],
    )
    payload.update(cambios)
    response = client.post(
        "/api/citas/",
        json=payload,
        headers=_headers(token_recepcion),
    )
    assert response.status_code == status


def test_creacion_cita_rechaza_medico_de_otra_clinica(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    with app.app_context():
        otra_clinica = Clinica(
            nombre="Otra clínica", direccion="Dirección de prueba", estado=True
        )
        otro_usuario = Usuario(
            nombre="Otro",
            ape_paterno="Medico",
            ape_materno="Prueba",
            rol="medicos",
            usuario="otro_medico_crear_cita",
            contrasena="hash-test",
        )
        db.session.add_all([otra_clinica, otro_usuario])
        db.session.flush()
        otro_medico = Medico(
            id_usuario=otro_usuario.id_usuario,
            id_clinica=otra_clinica.id_clinica,
            nombre="Otro",
            ape_paterno="Medico",
            ape_materno="Prueba",
            especialidad="General",
            cedula_profesional="CED-OTRO-CITA-01",
            estado=True,
        )
        db.session.add(otro_medico)
        db.session.commit()
        id_otra_clinica = otra_clinica.id_clinica
        id_otro_medico = otro_medico.id_medico
        id_otro_usuario = otro_usuario.id_usuario

    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    response = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=id_otro_medico,
        ),
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 422

    with app.app_context():
        db.session.delete(db.session.get(Medico, id_otro_medico))
        db.session.delete(db.session.get(Usuario, id_otro_usuario))
        db.session.delete(db.session.get(Clinica, id_otra_clinica))
        db.session.commit()


@pytest.mark.parametrize("entidad", ["paciente", "medico"])
def test_creacion_cita_rechaza_entidades_inactivas(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch, entidad
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        if entidad == "paciente":
            objeto = db.session.get(Paciente, cita_demo[1])
        else:
            objeto = db.session.get(Medico, cita_demo[2])
        objeto.estado = False
        db.session.commit()

    response = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            fecha="2026-10-19",
        ),
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 404

    with app.app_context():
        objeto = (
            db.session.get(Paciente, cita_demo[1])
            if entidad == "paciente"
            else db.session.get(Medico, cita_demo[2])
        )
        objeto.estado = True
        db.session.commit()


def test_creacion_cita_solo_recepcion_y_clinica_del_servidor(
    app, client, token_admin, token_medico, token_recepcion,
    clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    payload = _nueva_cita(
        id_paciente=cita_demo[1],
        id_medico=cita_demo[2],
    )
    assert client.post("/api/citas/", json=payload).status_code == 401
    assert client.post(
        "/api/citas/", json=payload, headers=_headers(token_admin)
    ).status_code == 403
    assert client.post(
        "/api/citas/", json=payload, headers=_headers(token_medico)
    ).status_code == 403

    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", None)
    assert client.post(
        "/api/citas/", json=payload, headers=_headers(token_recepcion)
    ).status_code == 503


def test_empalmes_permiten_consecutivas_y_rechazan_parciales_misma_hora_y_anidadas(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    for hora_nueva, status in [
        ("10:30", 201),
        ("10:29", 409),
        ("09:30", 409),
        ("09:45", 409),
    ]:
        response = client.post(
            "/api/citas/",
            json=_nueva_cita(
                id_paciente=cita_demo[1],
                id_medico=cita_demo[2],
                fecha="2026-10-17",
                hora=hora_nueva,
            ),
            headers=_headers(token_recepcion),
        )
        assert response.status_code == status
        if status == 201:
            with app.app_context():
                nueva = db.session.get(Cita, response.get_json()["data"]["id_cita"])
                db.session.delete(nueva)
                db.session.commit()


@pytest.mark.parametrize("estado", ["Cancelada", "Reagendada"])
def test_citas_canceladas_y_reagendadas_no_bloquean_horario(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch, estado
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        original = db.session.get(Cita, cita_demo[0])
        original.estado = estado
        db.session.commit()

    response = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            fecha="2026-10-17",
            hora="09:30",
        ),
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 201
    with app.app_context():
        nueva = db.session.get(Cita, response.get_json()["data"]["id_cita"])
        db.session.delete(nueva)
        original = db.session.get(Cita, cita_demo[0])
        original.estado = "Agendada"
        db.session.commit()


def test_cita_atendida_bloquea_horario(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        db.session.get(Cita, cita_demo[0]).estado = "Atendida"
        db.session.commit()

    response = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            fecha="2026-10-17",
            hora="09:30",
        ),
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 409


def test_empalme_considera_citas_que_cruzan_de_dia(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        original = db.session.get(Cita, cita_demo[0])
        original.fecha = date(2026, 10, 16)
        original.hora = time(23, 30)
        db.session.commit()

    conflicto = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            fecha="2026-10-17",
            hora="00:15",
        ),
        headers=_headers(token_recepcion),
    )
    consecutiva = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            fecha="2026-10-17",
            hora="00:30",
        ),
        headers=_headers(token_recepcion),
    )
    assert conflicto.status_code == 409
    assert consecutiva.status_code == 201

    with app.app_context():
        db.session.delete(
            db.session.get(Cita, consecutiva.get_json()["data"]["id_cita"])
        )
        original = db.session.get(Cita, cita_demo[0])
        original.fecha = date(2026, 10, 17)
        original.hora = time(9, 30)
        original.estado = "Agendada"
        db.session.commit()


def test_fallo_de_commit_no_persiste_nueva_cita(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)

    def fallo_commit():
        raise RuntimeError("fallo simulado")

    monkeypatch.setattr(db.session, "commit", fallo_commit)
    response = client.post(
        "/api/citas/",
        json=_nueva_cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
        ),
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 500
    monkeypatch.undo()
    with app.app_context():
        assert db.session.query(Cita).filter_by(
            fecha=date(2026, 10, 19), hora=time(9, 0)
        ).count() == 0


def test_recepcion_reprograma_misma_cita_en_clinica_operativa(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    response = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json={"fecha": "2026-10-19", "hora": "11:15"},
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["id_cita"] == cita_demo[0]
    assert data["fecha"] == "2026-10-19"
    assert data["hora"] == "11:15"
    with app.app_context():
        cita = db.session.get(Cita, cita_demo[0])
        assert cita.id_paciente == cita_demo[1]
        assert cita.id_medico == cita_demo[2]
        assert cita.id_clinica == clinica_demo.id_clinica
        assert cita.estado == "Agendada"
        assert cita.motivo == "Consulta de prueba"
        assert db.session.query(Cita).count() == 1


def test_reprogramar_excluye_la_propia_cita_y_permite_intervalo_consecutivo(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    misma_hora = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json={"fecha": "2026-10-17", "hora": "09:30"},
        headers=_headers(token_recepcion),
    )
    assert misma_hora.status_code == 200

    with app.app_context():
        consecutiva = Cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            id_clinica=clinica_demo.id_clinica,
            fecha=date(2026, 10, 20),
            hora=time(10, 30),
            motivo="Otra cita",
            estado="Agendada",
        )
        db.session.add(consecutiva)
        db.session.commit()
        id_consecutiva = consecutiva.id_cita

    response = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json={"fecha": "2026-10-20", "hora": "11:30"},
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["id_cita"] == cita_demo[0]
    with app.app_context():
        db.session.delete(db.session.get(Cita, id_consecutiva))
        db.session.commit()


def test_reprogramar_rechaza_empalme_con_cita_de_otro_registro(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        db.session.add(Cita(
            id_paciente=cita_demo[1],
            id_medico=cita_demo[2],
            id_clinica=clinica_demo.id_clinica,
            fecha=date(2026, 10, 20),
            hora=time(10, 30),
            motivo="Otra cita",
            estado="Agendada",
        ))
        db.session.commit()
        id_otra_cita = db.session.query(Cita).filter_by(
            fecha=date(2026, 10, 20), hora=time(10, 30)
        ).one().id_cita
        original = db.session.get(Cita, cita_demo[0])
        horario_original = (original.fecha, original.hora)

    response = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json={"fecha": "2026-10-20", "hora": "10:45"},
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 409
    assert "empalma" in response.get_json()["error"]
    with app.app_context():
        original = db.session.get(Cita, cita_demo[0])
        assert (original.fecha, original.hora) == horario_original
        db.session.delete(db.session.get(Cita, id_otra_cita))
        db.session.commit()


def test_reprogramar_rechaza_cita_inexistente_o_de_otra_clinica(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    no_existe = client.post(
        "/api/citas/999999/reprogramar",
        json={"fecha": "2026-10-19", "hora": "11:00"},
        headers=_headers(token_recepcion),
    )
    assert no_existe.status_code == 404

    with app.app_context():
        otra_clinica = Clinica(
            nombre="Otra clínica reprogramación",
            direccion="Dirección de prueba",
            estado=True,
        )
        db.session.add(otra_clinica)
        db.session.flush()
        cita = db.session.get(Cita, cita_demo[0])
        cita.id_clinica = otra_clinica.id_clinica
        db.session.commit()
        id_otra_clinica = otra_clinica.id_clinica

    fuera_de_alcance = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json={"fecha": "2026-10-19", "hora": "11:00"},
        headers=_headers(token_recepcion),
    )
    assert fuera_de_alcance.status_code == 404

    with app.app_context():
        cita = db.session.get(Cita, cita_demo[0])
        cita.id_clinica = clinica_demo.id_clinica
        db.session.delete(db.session.get(Clinica, id_otra_clinica))
        db.session.commit()


@pytest.mark.parametrize("estado", ["Atendida", "Cancelada", "Reagendada"])
def test_reprogramar_solo_acepta_estado_agendada(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch, estado
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        db.session.get(Cita, cita_demo[0]).estado = estado
        db.session.commit()

    response = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json={"fecha": "2026-10-19", "hora": "11:00"},
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 409
    with app.app_context():
        assert db.session.get(Cita, cita_demo[0]).estado == estado


@pytest.mark.parametrize(
    "payload",
    [
        {"fecha": "2026-02-30", "hora": "10:00"},
        {"fecha": "2026-10-19", "hora": "24:00"},
        {"fecha": "2026-10-19"},
        {"fecha": "2026-10-19", "hora": "10:00", "estado": "Cancelada"},
        {"fecha": "2026-10-19", "hora": "10:00", "id_clinica": 2},
        {"fecha": "2026-10-19", "hora": "10:00", "id_medico": 2},
        {"fecha": "2026-10-19", "hora": "10:00", "id_paciente": 2},
    ],
)
def test_reprogramar_rechaza_datos_invalidos_o_no_permitidos(
    client, token_recepcion, cita_demo, payload
):
    response = client.post(
        f"/api/citas/{cita_demo[0]}/reprogramar",
        json=payload,
        headers=_headers(token_recepcion),
    )
    assert response.status_code == 422


def test_solo_recepcion_puede_reprogramar(
    client, token_admin, token_medico, token_recepcion, cita_demo
):
    ruta = f"/api/citas/{cita_demo[0]}/reprogramar"
    payload = {"fecha": "2026-10-19", "hora": "11:00"}

    assert client.post(ruta, json=payload).status_code == 401
    assert client.post(
        ruta, json=payload, headers=_headers(token_admin)
    ).status_code == 403
    assert client.post(
        ruta, json=payload, headers=_headers(token_medico)
    ).status_code == 403


def test_fallo_de_commit_revierte_fecha_y_hora_de_reprogramacion(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)

    def fallo_commit():
        raise RuntimeError("fallo simulado")

    monkeypatch.setattr(db.session, "commit", fallo_commit)
    try:
        response = client.post(
            f"/api/citas/{cita_demo[0]}/reprogramar",
            json={"fecha": "2026-10-19", "hora": "11:00"},
            headers=_headers(token_recepcion),
        )
    finally:
        monkeypatch.undo()

    assert response.status_code == 500
    with app.app_context():
        cita = db.session.get(Cita, cita_demo[0])
        assert cita.fecha == date(2026, 10, 17)
        assert cita.hora == time(9, 30)


def test_recepcion_cancela_cita_agendada_en_clinica_configurada(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)

    response = client.post(
        f"/api/citas/{cita_demo[0]}/cancelar",
        json={},
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["estado"] == "Cancelada"
    with app.app_context():
        assert db.session.get(Cita, cita_demo[0]).estado == "Cancelada"


def test_cancelacion_no_acepta_id_de_clinica_en_el_cliente(
    client, token_recepcion, cita_demo
):
    response = client.post(
        f"/api/citas/{cita_demo[0]}/cancelar",
        json={"id_clinica": cita_demo[0]},
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 422


def test_recepcion_no_puede_cancelar_cita_de_otra_clinica(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    with app.app_context():
        otra_clinica = Clinica(
            nombre="Otra Clínica", direccion="Dirección de prueba", estado=True
        )
        db.session.add(otra_clinica)
        db.session.commit()
        id_otra_clinica = otra_clinica.id_clinica

    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", id_otra_clinica)
    response = client.post(
        f"/api/citas/{cita_demo[0]}/cancelar",
        json={},
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 404
    with app.app_context():
        assert db.session.get(Cita, cita_demo[0]).estado == "Agendada"
        db.session.delete(db.session.get(Clinica, id_otra_clinica))
        db.session.commit()


@pytest.mark.parametrize("estado", ["Atendida", "Cancelada", "Reagendada"])
def test_solo_puede_cancelarse_cita_agendada(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch, estado
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    with app.app_context():
        cita = db.session.get(Cita, cita_demo[0])
        cita.estado = estado
        db.session.commit()

    response = client.post(
        f"/api/citas/{cita_demo[0]}/cancelar",
        json={},
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 409
    with app.app_context():
        assert db.session.get(Cita, cita_demo[0]).estado == estado


def test_cancelacion_requiere_recepcion_y_clinica_configurada(
    app, client, token_admin, token_medico, token_recepcion,
    clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)
    path = f"/api/citas/{cita_demo[0]}/cancelar"

    assert client.post(path, json={}).status_code == 401
    assert client.post(path, json={}, headers=_headers(token_admin)).status_code == 403
    assert client.post(path, json={}, headers=_headers(token_medico)).status_code == 403

    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", None)
    assert client.post(path, json={}, headers=_headers(token_recepcion)).status_code == 503
    with app.app_context():
        assert db.session.get(Cita, cita_demo[0]).estado == "Agendada"


def test_error_transaccional_revierte_cancelacion(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(app.config, "RECEPTION_CLINIC_ID", clinica_demo.id_clinica)

    def fallo_commit():
        raise RuntimeError("fallo de commit")

    monkeypatch.setattr(db.session, "commit", fallo_commit)
    response = client.post(
        f"/api/citas/{cita_demo[0]}/cancelar",
        json={},
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 500
    monkeypatch.undo()
    with app.app_context():
        assert db.session.get(Cita, cita_demo[0]).estado == "Agendada"


def test_detalle_cita_accesible_a_recepcion_de_su_clinica(
    app, client, token_recepcion, clinica_demo, cita_demo, monkeypatch
):
    monkeypatch.setitem(
        app.config, "RECEPTION_CLINIC_ID", str(clinica_demo.id_clinica)
    )

    response = client.get(
        f"/api/citas/{cita_demo[0]}",
        headers=_headers(token_recepcion),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["id_cita"] == cita_demo[0]


def test_medico_no_puede_ver_detalle_de_otro_medico(
    app, client, token_medico, usuario_medico, clinica_demo
):
    with app.app_context():
        _, medico_actual = usuario_medico
        otro_paciente = Paciente(
            nombre="Otro",
            ape_paterno="Paciente",
            ape_materno="Prueba",
            fecha_nacimiento=date(1991, 1, 1),
            sexo="M",
            estado=True,
        )
        otro_usuario = Usuario(
            nombre="Otro",
            ape_paterno="Medico",
            ape_materno="Prueba",
            rol="medicos",
            usuario="otro_medico_citas_test",
            contrasena="hash-de-prueba",
        )
        db.session.add(otro_paciente)
        db.session.add(otro_usuario)
        db.session.flush()
        otro_medico = Medico(
            id_usuario=otro_usuario.id_usuario,
            id_clinica=clinica_demo.id_clinica,
            nombre="Otro",
            ape_paterno="Medico",
            ape_materno="Prueba",
            especialidad="General",
            cedula_profesional="CED-CITAS-OTRO-01",
            estado=True,
        )
        db.session.add(otro_medico)
        db.session.flush()
        otra_cita = Cita(
            id_paciente=otro_paciente.id_paciente,
            id_medico=otro_medico.id_medico,
            id_clinica=clinica_demo.id_clinica,
            fecha=date(2026, 10, 17),
            hora=time(10, 30),
            estado="Agendada",
        )
        db.session.add(otra_cita)
        db.session.commit()
        id_cita = otra_cita.id_cita
        id_paciente = otro_paciente.id_paciente
        id_medico = otro_medico.id_medico
        id_usuario = otro_usuario.id_usuario

    response = client.get(
        f"/api/citas/{id_cita}",
        headers=_headers(token_medico),
    )

    assert response.status_code == 404

    with app.app_context():
        db.session.delete(db.session.get(Cita, id_cita))
        db.session.delete(db.session.get(Paciente, id_paciente))
        db.session.delete(db.session.get(Medico, id_medico))
        db.session.delete(db.session.get(Usuario, id_usuario))
        db.session.commit()


def test_roles_no_autorizados_y_sin_token_se_rechazan(
    client, token_admin, cita_demo
):
    assert client.get("/api/citas/?fecha=2026-10-17").status_code == 401
    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_admin),
    )
    assert response.status_code == 403


def test_medico_inactivo_no_puede_consultar_su_agenda(
    app, client, token_medico, usuario_medico
):
    with app.app_context():
        id_medico = usuario_medico[1].id_medico
        medico = db.session.get(Medico, id_medico)
        medico.estado = False
        db.session.commit()

    response = client.get(
        "/api/citas/?fecha=2026-10-17",
        headers=_headers(token_medico),
    )

    assert response.status_code == 403
