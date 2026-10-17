"""Pruebas de consultas e historial usando SQLite en memoria."""

from datetime import date, time

import pytest

from app.extensions import db
from app.models.cita import Cita
from app.models.consulta import Consulta
from app.models.detalle_receta import DetalleReceta
from app.models.medico import Medico
from app.models.paciente import Paciente
from app.models.receta import Receta
from app.models.usuario import Usuario
from app.utils.security import create_access_token, hash_password


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def consulta_case(app, usuario_medico):
    with app.app_context():
        _, medico = usuario_medico
        paciente = Paciente(
            nombre="Paciente",
            ape_paterno="Prueba",
            ape_materno="Consulta",
            fecha_nacimiento=date(1990, 1, 1),
            sexo="O",
            estado=True,
        )
        db.session.add(paciente)
        db.session.flush()
        cita = Cita(
            id_paciente=paciente.id_paciente,
            id_medico=medico.id_medico,
            id_clinica=medico.id_clinica,
            fecha=date(2026, 10, 17),
            hora=time(9, 30),
            motivo="Consulta de prueba",
            estado="Agendada",
        )
        db.session.add(cita)
        db.session.commit()
        ids = (cita.id_cita, paciente.id_paciente, medico.id_medico)
        yield ids
        stored_cita = db.session.get(Cita, ids[0])
        if stored_cita is not None:
            for consulta in list(stored_cita.consultas):
                for receta in list(consulta.recetas):
                    for detalle in list(receta.detalles):
                        db.session.delete(detalle)
                    db.session.delete(receta)
                db.session.delete(consulta)
            db.session.delete(stored_cita)
        db.session.delete(db.session.get(Paciente, ids[1]))
        db.session.commit()


def _registrar_consulta(client, token, id_cita, body=None):
    return client.post(
        f"/api/citas/{id_cita}/consulta",
        json=body or {"motivo": "Dolor de cabeza", "diagnostico": "Migraña"},
        headers=_headers(token),
    )


def _emitir_receta(client, token, id_consulta, body=None):
    return client.post(
        f"/api/consultas/{id_consulta}/recetas",
        json=body or {
            "indicaciones": "Tomar con agua",
            "detalles": [{"medicamento": "Medicamento de prueba", "dosis": "1 tableta"}],
        },
        headers=_headers(token),
    )


def test_medico_registra_su_cita_y_actualiza_estado_atomico(
    client, token_medico, consulta_case
):
    response = _registrar_consulta(client, token_medico, consulta_case[0])

    assert response.status_code == 201
    assert response.get_json()["data"]["diagnostico"] == "Migraña"
    db.session.expire_all()
    cita = db.session.get(Cita, consulta_case[0])
    consulta = db.session.execute(
        db.select(Consulta).where(Consulta.id_cita == consulta_case[0])
    ).scalar_one()
    assert cita.estado == "Atendida"
    assert consulta.id_consulta == response.get_json()["data"]["id_consulta"]


def test_consulta_requiere_autenticacion_y_rol_medico(
    client, token_admin, token_recepcion, consulta_case
):
    assert client.post(
        f"/api/citas/{consulta_case[0]}/consulta", json={"motivo": "x"}
    ).status_code == 401
    assert _registrar_consulta(
        client, token_admin, consulta_case[0]
    ).status_code == 403
    assert _registrar_consulta(
        client, token_recepcion, consulta_case[0]
    ).status_code == 403


def test_cita_inexistente_o_asignada_a_otro_medico_no_es_visible(
    app, client, token_medico, consulta_case
):
    assert _registrar_consulta(
        client, token_medico, 999999
    ).status_code == 404
    with app.app_context():
        usuario = Usuario(
            nombre="Otro", ape_paterno="Medico", ape_materno="Test",
            rol="medicos", usuario="otro_medico_test",
            contrasena=hash_password("ContraseñaSegura123!"),
        )
        db.session.add(usuario)
        db.session.flush()
        clinica_id = db.session.get(Medico, consulta_case[2]).id_clinica
        otro = Medico(
            id_usuario=usuario.id_usuario,
            id_clinica=clinica_id,
            nombre="Otro", ape_paterno="Medico", ape_materno="Test",
            especialidad="General", cedula_profesional="CED-OTRO-TEST",
            estado=True,
        )
        db.session.add(otro)
        db.session.flush()
        otro_id = otro.id_medico
        otro_usuario_id = usuario.id_usuario
        cita = db.session.get(Cita, consulta_case[0])
        cita.id_medico = otro_id
        db.session.commit()
        token = create_access_token({
            "sub": str(usuario.id_usuario), "rol": usuario.rol,
        })

    response = _registrar_consulta(client, token_medico, consulta_case[0])
    assert response.status_code == 404

    with app.app_context():
        cita = db.session.get(Cita, consulta_case[0])
        cita.id_medico = consulta_case[2]
        db.session.flush()
        db.session.execute(
            db.delete(Medico)
            .where(Medico.id_medico == otro_id)
            .execution_options(synchronize_session=False)
        )
        db.session.execute(
            db.delete(Usuario)
            .where(Usuario.id_usuario == otro_usuario_id)
            .execution_options(synchronize_session=False)
        )
        db.session.commit()


@pytest.mark.parametrize("estado", ["Atendida", "Cancelada", "Reagendada"])
def test_rechaza_cita_en_estado_distinto_de_agendada(
    app, client, token_medico, consulta_case, estado
):
    with app.app_context():
        db.session.get(Cita, consulta_case[0]).estado = estado
        db.session.commit()

    response = _registrar_consulta(client, token_medico, consulta_case[0])
    assert response.status_code == 409


def test_rechaza_cita_que_ya_tiene_consulta(
    app, client, token_medico, consulta_case
):
    with app.app_context():
        db.session.add(Consulta(id_cita=consulta_case[0], motivo="Consulta previa"))
        db.session.commit()

    response = _registrar_consulta(client, token_medico, consulta_case[0])
    assert response.status_code == 409


@pytest.mark.parametrize(
    "body",
    [
        {"exploracion": "No existe en el esquema"},
        {"id_medico": 1, "motivo": "x"},
        {"motivo": ["no", "es", "texto"]},
        {"diagnostico": "x" * 10001},
        {"motivo": " ", "diagnostico": ""},
    ],
)
def test_rechaza_campos_clinicos_invalidos_o_no_permitidos(
    client, token_medico, consulta_case, body
):
    response = _registrar_consulta(client, token_medico, consulta_case[0], body)
    assert response.status_code == 422


def test_fallo_de_commit_revierte_consulta_y_estado(
    app, client, token_medico, consulta_case, monkeypatch
):
    def fail_commit():
        raise RuntimeError("commit de prueba")

    with app.app_context():
        monkeypatch.setattr(db.session, "commit", fail_commit)
        response = _registrar_consulta(client, token_medico, consulta_case[0])
        monkeypatch.undo()
        db.session.expire_all()
        assert response.status_code == 500
        assert db.session.get(Cita, consulta_case[0]).estado == "Agendada"
        assert db.session.execute(
            db.select(Consulta).where(Consulta.id_cita == consulta_case[0])
        ).scalar_one_or_none() is None


def test_emite_receta_con_detalles_solo_para_consulta_del_medico(
    client, token_medico, consulta_case
):
    created = _registrar_consulta(client, token_medico, consulta_case[0])
    id_consulta = created.get_json()["data"]["id_consulta"]

    response = _emitir_receta(client, token_medico, id_consulta)

    assert response.status_code == 201
    assert response.get_json()["data"]["detalles"][0]["medicamento"] == (
        "Medicamento de prueba"
    )


def test_receta_rechaza_ids_del_cliente_y_detalles_invalidos(
    client, token_medico, consulta_case
):
    created = _registrar_consulta(client, token_medico, consulta_case[0])
    id_consulta = created.get_json()["data"]["id_consulta"]
    assert _emitir_receta(
        client, token_medico, id_consulta,
        {"id_consulta": id_consulta, "detalles": [{"medicamento": "x"}]},
    ).status_code == 422
    assert _emitir_receta(
        client, token_medico, id_consulta, {"detalles": []}
    ).status_code == 422
    assert _emitir_receta(
        client, token_medico, id_consulta,
        {"detalles": [{"medicamento": "x" * 151}]},
    ).status_code == 422
    assert _emitir_receta(
        client, token_medico, id_consulta, {"detalles": [{}]}
    ).status_code == 422


def test_emision_de_receta_requiere_medico_autorizado(
    client, token_medico, token_admin, token_recepcion, consulta_case
):
    created = _registrar_consulta(client, token_medico, consulta_case[0])
    id_consulta = created.get_json()["data"]["id_consulta"]
    body = {"detalles": [{"medicamento": "Medicamento de prueba"}]}

    assert client.post(
        f"/api/consultas/{id_consulta}/recetas", json=body
    ).status_code == 401
    assert client.post(
        f"/api/consultas/{id_consulta}/recetas",
        json=body,
        headers=_headers(token_admin),
    ).status_code == 403
    assert client.post(
        f"/api/consultas/{id_consulta}/recetas",
        json=body,
        headers=_headers(token_recepcion),
    ).status_code == 403


def test_fallo_de_commit_revierte_receta(
    app, client, token_medico, consulta_case, monkeypatch
):
    created = _registrar_consulta(client, token_medico, consulta_case[0])
    id_consulta = created.get_json()["data"]["id_consulta"]

    def fail_commit():
        raise RuntimeError("commit de prueba")

    with app.app_context():
        monkeypatch.setattr(db.session, "commit", fail_commit)
        response = _emitir_receta(client, token_medico, id_consulta)
        monkeypatch.undo()
        assert response.status_code == 500
        assert db.session.execute(
            db.select(Receta).where(Receta.id_consulta == id_consulta)
        ).scalar_one_or_none() is None


def test_fallo_al_guardar_detalle_revierte_receta(
    app, client, token_medico, consulta_case, monkeypatch
):
    created = _registrar_consulta(client, token_medico, consulta_case[0])
    id_consulta = created.get_json()["data"]["id_consulta"]
    original_add_all = db.session.add_all

    def fail_details(objects):
        objects = list(objects)
        if any(isinstance(item, DetalleReceta) for item in objects):
            raise RuntimeError("fallo de prueba al guardar detalle")
        original_add_all(objects)

    with app.app_context():
        monkeypatch.setattr(db.session, "add_all", fail_details)
        response = _emitir_receta(client, token_medico, id_consulta)
        monkeypatch.undo()
        assert response.status_code == 500
        assert db.session.execute(
            db.select(Receta).where(Receta.id_consulta == id_consulta)
        ).scalar_one_or_none() is None


def test_historial_solo_medico_autorizado_incluye_consulta_receta_y_detalle(
    client, token_medico, token_recepcion, token_admin, consulta_case
):
    created = _registrar_consulta(client, token_medico, consulta_case[0])
    id_consulta = created.get_json()["data"]["id_consulta"]
    _emitir_receta(client, token_medico, id_consulta)

    response = client.get(
        f"/api/pacientes/{consulta_case[1]}/historial",
        headers=_headers(token_medico),
    )
    assert response.status_code == 200
    consulta = response.get_json()["data"]["citas"][0]["consulta"]
    assert consulta["diagnostico"] == "Migraña"
    assert consulta["recetas"][0]["detalles"][0]["medicamento"] == (
        "Medicamento de prueba"
    )

    assert client.get(
        f"/api/pacientes/{consulta_case[1]}/historial",
        headers=_headers(token_recepcion),
    ).status_code == 403
    assert client.get(
        f"/api/pacientes/{consulta_case[1]}/historial",
        headers=_headers(token_admin),
    ).status_code == 403


def test_historial_no_enumera_pacientes_inexistentes_o_ajenos(
    app, client, token_medico, consulta_case
):
    assert client.get(
        "/api/pacientes/999999/historial",
        headers=_headers(token_medico),
    ).status_code == 404

    with app.app_context():
        otro = Paciente(
            nombre="Otro", ape_paterno="Paciente", ape_materno="Test",
            fecha_nacimiento=date(1991, 1, 1), sexo="O", estado=True,
        )
        db.session.add(otro)
        db.session.commit()
        otro_id = otro.id_paciente

    response = client.get(
        f"/api/pacientes/{otro_id}/historial",
        headers=_headers(token_medico),
    )
    assert response.status_code == 404

    with app.app_context():
        db.session.delete(db.session.get(Paciente, otro_id))
        db.session.commit()
