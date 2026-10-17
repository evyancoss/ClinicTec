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


def test_admin_edita_nombres_de_usuario_sin_perfil_medico(
    app, client, token_admin, usuario_recepcion
):
    hash_original = usuario_recepcion.contrasena
    response = client.put(
        f"/api/usuarios/{usuario_recepcion.id_usuario}",
        json={
            "nombre": "Recepción",
            "ape_paterno": "Actualizada",
            "ape_materno": "Prueba",
        },
        headers=_headers(token_admin),
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["nombre"] == "Recepción"
    assert data["ape_paterno"] == "Actualizada"
    assert data["ape_materno"] == "Prueba"
    assert "contrasena" not in response.get_data(as_text=True)
    assert "argon2" not in response.get_data(as_text=True).lower()
    with app.app_context():
        usuario = db.session.get(Usuario, usuario_recepcion.id_usuario)
        assert usuario.usuario == "recep_test"
        assert usuario.rol == "recepcion"
        assert usuario.contrasena == hash_original


def test_edicion_usuario_no_permite_modificar_campos_sensibles(
    app, client, token_admin, usuario_recepcion, usuario_admin
):
    response = client.put(
        f"/api/usuarios/{usuario_recepcion.id_usuario}",
        json={
            "nombre": "Recepción",
            "ape_paterno": "Prueba",
            "ape_materno": "Local",
            "usuario": usuario_admin.usuario,
            "rol": "administrador",
            "contrasena": "NuevaContrasenaSegura123!",
        },
        headers=_headers(token_admin),
    )

    assert response.status_code == 422
    with app.app_context():
        usuario = db.session.get(Usuario, usuario_recepcion.id_usuario)
        assert usuario.nombre == "Recep"
        assert usuario.usuario == "recep_test"
        assert usuario.rol == "recepcion"


def test_edicion_usuario_rechaza_datos_invalidos_y_usuario_inexistente(
    client, token_admin, usuario_recepcion
):
    invalid = client.put(
        f"/api/usuarios/{usuario_recepcion.id_usuario}",
        json={
            "nombre": "Recep1",
            "ape_paterno": "Prueba",
            "ape_materno": "Local",
        },
        headers=_headers(token_admin),
    )
    assert invalid.status_code == 422

    missing = client.put(
        "/api/usuarios/999999",
        json={
            "nombre": "Nombre",
            "ape_paterno": "Apellido",
            "ape_materno": "Prueba",
        },
        headers=_headers(token_admin),
    )
    assert missing.status_code == 404


def test_admin_edita_usuario_y_perfil_medico_de_forma_coordinada(
    client, token_admin, usuario_medico
):
    usuario, _ = usuario_medico
    response = client.put(
        f"/api/usuarios/{usuario.id_usuario}",
        json={
            "nombre": "Medico",
            "ape_paterno": "Nuevo",
            "ape_materno": "Apellido",
        },
        headers=_headers(token_admin),
    )
    assert response.status_code == 200
    assert "contrasena" not in response.get_data(as_text=True)
    assert "argon2" not in response.get_data(as_text=True).lower()
    with client.application.app_context():
        cuenta = db.session.get(Usuario, usuario.id_usuario)
        medico = db.session.query(Medico).filter_by(
            id_usuario=usuario.id_usuario
        ).one()
        assert (cuenta.nombre, cuenta.ape_paterno, cuenta.ape_materno) == (
            medico.nombre, medico.ape_paterno, medico.ape_materno
        )
        assert (medico.nombre, medico.ape_paterno, medico.ape_materno) == (
            "Medico", "Nuevo", "Apellido"
        )


def test_fallo_de_edicion_medica_revierte_ambas_tablas(
    app, client, token_admin, usuario_medico, monkeypatch
):
    usuario, _ = usuario_medico

    def fallo_commit():
        raise RuntimeError("fallo simulado")

    monkeypatch.setattr(db.session, "commit", fallo_commit)
    response = client.put(
        f"/api/usuarios/{usuario.id_usuario}",
        json={
            "nombre": "Cambio",
            "ape_paterno": "No",
            "ape_materno": "Guardado",
        },
        headers=_headers(token_admin),
    )
    assert response.status_code == 500

    monkeypatch.undo()
    with app.app_context():
        cuenta = db.session.get(Usuario, usuario.id_usuario)
        medico = db.session.query(Medico).filter_by(
            id_usuario=usuario.id_usuario
        ).one()
        assert (cuenta.nombre, cuenta.ape_paterno, cuenta.ape_materno) == (
            "Medico", "Test", "Demo"
        )
        assert (medico.nombre, medico.ape_paterno, medico.ape_materno) == (
            "Medico", "Test", "Demo"
        )


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
    client, token_medico, token_recepcion, usuario_recepcion
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
    payload_edicion = {
        "nombre": "No",
        "ape_paterno": "Autorizado",
        "ape_materno": "Local",
    }
    assert client.put(
        f"/api/usuarios/{usuario_recepcion.id_usuario}",
        json=payload_edicion,
        headers=_headers(token_medico),
    ).status_code == 403
    assert client.put(
        f"/api/usuarios/{usuario_recepcion.id_usuario}",
        json=payload_edicion,
        headers=_headers(token_recepcion),
    ).status_code == 403
    with client.application.app_context():
        assert db.session.query(Usuario).filter(
            Usuario.usuario.in_(["medico_no_admin", "recepcion_no_admin"])
        ).count() == 0
        usuario = db.session.get(Usuario, usuario_recepcion.id_usuario)
        assert usuario.nombre == "Recep"


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
