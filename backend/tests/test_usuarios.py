"""Pruebas administrativas de usuarios con SQLite en memoria."""

from app.extensions import db
from app.models.clinica import Clinica
from app.models.medico import Medico
from app.models.usuario import Usuario


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _nuevo_usuario(**overrides):
    payload = {
        "nombre": "Ana",
        "ape_paterno": "Prueba",
        "ape_materno": "Local",
        "usuario": "alta_test",
        "contrasena": "ContrasenaSegura123!",
        "rol": "recepcion",
    }
    return payload | overrides


def test_listar_usuarios_solo_admin_y_sin_hash(client, token_admin, token_recepcion):
    response = client.get("/api/usuarios/", headers=_headers(token_admin))
    assert response.status_code == 200
    assert isinstance(response.get_json()["data"], list)
    assert "contrasena" not in response.get_data(as_text=True)

    assert client.get(
        "/api/usuarios/", headers=_headers(token_recepcion)
    ).status_code == 403
    assert client.get("/api/usuarios/").status_code == 401


def test_crear_usuario_recepcion_guarda_hash_y_no_lo_expone(
    app, client, token_admin
):
    response = client.post(
        "/api/usuarios/",
        json=_nuevo_usuario(),
        headers=_headers(token_admin),
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["usuario"] == "alta_test"
    assert data["rol"] == "recepcion"
    assert "contrasena" not in response.get_data(as_text=True)

    with app.app_context():
        usuario = db.session.get(Usuario, data["id_usuario"])
        assert usuario is not None
        assert usuario.contrasena != "ContrasenaSegura123!"
        db.session.delete(usuario)
        db.session.commit()


def test_crear_medico_registra_cuenta_y_perfil_en_clinica_activa(
    app, client, token_admin, clinica_demo
):
    response = client.post(
        "/api/usuarios/",
        json=_nuevo_usuario(
            usuario="medico_alta_test",
            rol="medicos",
            id_clinica=clinica_demo.id_clinica,
            especialidad="Medicina general",
            cedula_profesional="CED-ALTA-TEST-01",
            telefono="5512345678",
            correo="medico@example.test",
        ),
        headers=_headers(token_admin),
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["medico"]["id_clinica"] == clinica_demo.id_clinica
    assert data["medico"]["nombre_clinica"] == "Clínica Demo"

    with app.app_context():
        usuario = db.session.get(Usuario, data["id_usuario"])
        medico = db.session.query(Medico).filter_by(
            id_usuario=data["id_usuario"]
        ).one()
        assert usuario.rol == "medicos"
        assert medico.cedula_profesional == "CED-ALTA-TEST-01"
        db.session.delete(medico)
        db.session.delete(usuario)
        db.session.commit()


def test_rechaza_datos_invalidos_y_rol_no_autorizado(client, token_admin):
    invalid = client.post(
        "/api/usuarios/",
        json=_nuevo_usuario(rol="superusuario"),
        headers=_headers(token_admin),
    )
    assert invalid.status_code == 422

    assert client.post(
        "/api/usuarios/", json=_nuevo_usuario(usuario="sin_auth_alta")
    ).status_code == 401


def test_roles_no_admin_no_pueden_listar_ni_crear_usuarios(
    client, token_medico, token_recepcion
):
    assert client.get(
        "/api/usuarios/", headers=_headers(token_medico)
    ).status_code == 403
    assert client.post(
        "/api/usuarios/",
        json=_nuevo_usuario(usuario="medico_no_admin"),
        headers=_headers(token_medico),
    ).status_code == 403
    assert client.post(
        "/api/usuarios/",
        json=_nuevo_usuario(usuario="recepcion_no_admin"),
        headers=_headers(token_recepcion),
    ).status_code == 403


def test_error_de_unicidad_reversa_alta_de_cuenta_medico(
    app, client, token_admin, usuario_medico
):
    response = client.post(
        "/api/usuarios/",
        json=_nuevo_usuario(
            usuario="medico_duplicado_cedula",
            rol="medicos",
            id_clinica=usuario_medico[1].id_clinica,
            especialidad="Medicina general",
            cedula_profesional="CED-TEST-001",
        ),
        headers=_headers(token_admin),
    )
    assert response.status_code == 409
    with app.app_context():
        assert db.session.query(Usuario).filter_by(
            usuario="medico_duplicado_cedula"
        ).one_or_none() is None


def test_listar_clinicas_devuelve_solo_activas(client, token_admin, clinica_demo):
    with client.application.app_context():
        inactiva = Clinica(
            nombre="Clínica Inactiva", direccion="Calle Prueba 2", estado=False
        )
        db.session.add(inactiva)
        db.session.commit()
        id_inactiva = inactiva.id_clinica

    response = client.get(
        "/api/usuarios/clinicas", headers=_headers(token_admin)
    )
    assert response.status_code == 200
    ids = {clinic["id_clinica"] for clinic in response.get_json()["data"]}
    assert clinica_demo.id_clinica in ids
    assert id_inactiva not in ids

    with client.application.app_context():
        db.session.delete(db.session.get(Clinica, id_inactiva))
        db.session.commit()
