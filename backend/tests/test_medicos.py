"""
tests/test_medicos.py
Pruebas para los endpoints de médicos.
SQLite en memoria — no toca Supabase.
"""


class TestListarMedicos:

    def test_recepcion_puede_listar(self, client, token_recepcion, usuario_medico):
        resp = client.get("/api/medicos/", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 200
        assert isinstance(resp.get_json()["data"], list)
        assert resp.get_json()["data"][0]["nombre_clinica"] == "Clínica Demo"
        assert "id_usuario" not in resp.get_json()["data"][0]

    def test_admin_puede_listar(self, client, token_admin, usuario_medico):
        resp = client.get("/api/medicos/", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 200

    def test_medico_no_puede_listar(self, client, token_medico):
        resp = client.get("/api/medicos/", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

    def test_sin_token_rechazado(self, client):
        resp = client.get("/api/medicos/")
        assert resp.status_code == 401

    def test_no_expone_contrasena(self, client, token_recepcion, usuario_medico):
        raw = client.get("/api/medicos/", headers={
            "Authorization": f"Bearer {token_recepcion}"
        }).data.decode()
        assert "contrasena" not in raw


class TestMiPerfilMedico:

    def test_medico_obtiene_su_perfil(self, client, token_medico, usuario_medico):
        resp = client.get("/api/medicos/yo", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "id_medico" in data
        assert "especialidad" in data
        assert "nombre_clinica" in data
        assert "id_usuario" not in data

    def test_recepcion_no_puede_acceder_a_yo(self, client, token_recepcion):
        resp = client.get("/api/medicos/yo", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 403

    def test_admin_no_puede_acceder_a_yo(self, client, token_admin):
        resp = client.get("/api/medicos/yo", headers={
            "Authorization": f"Bearer {token_admin}"
        })
        assert resp.status_code == 403

    def test_sin_token_rechazado(self, client):
        resp = client.get("/api/medicos/yo")
        assert resp.status_code == 401


class TestObtenerMedico:

    def test_recepcion_obtiene_medico(self, client, token_recepcion, usuario_medico):
        _, medico = usuario_medico
        resp = client.get(f"/api/medicos/{medico.id_medico}", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 200

    def test_medico_obtiene_su_propio_perfil(self, client, token_medico, usuario_medico):
        _, medico = usuario_medico
        resp = client.get(f"/api/medicos/{medico.id_medico}", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 200

    def test_medico_no_puede_ver_perfil_ajeno(self, client, app,
                                               token_medico, clinica_demo):
        """Un médico intenta ver el perfil de otro médico — debe rechazarse."""
        from app.extensions import db
        from app.models.medico import Medico
        from app.models.usuario import Usuario
        from app.utils.security import hash_password

        with app.app_context():
            u2 = Usuario(
                nombre="Otro", ape_paterno="Medico", ape_materno="Test",
                rol="medicos", usuario="otro_medico_test",
                contrasena=hash_password("Clave12345678!"),
            )
            db.session.add(u2)
            db.session.flush()
            m2 = Medico(
                id_usuario=u2.id_usuario,
                id_clinica=clinica_demo.id_clinica,
                nombre="Otro", ape_paterno="Medico", ape_materno="Test",
                especialidad="Cardiología",
                cedula_profesional="CED-TEST-002",
                estado=True,
            )
            db.session.add(m2)
            db.session.commit()
            id_m2 = m2.id_medico
            id_u2 = u2.id_usuario

        resp = client.get(f"/api/medicos/{id_m2}", headers={
            "Authorization": f"Bearer {token_medico}"
        })
        assert resp.status_code == 403

        # Limpiar
        with app.app_context():
            from app.extensions import db as db2
            m = db2.session.get(Medico, id_m2)
            u = db2.session.get(Usuario, id_u2)
            if m: db2.session.delete(m)
            if u: db2.session.delete(u)
            db2.session.commit()

    def test_id_inexistente_404(self, client, token_recepcion):
        resp = client.get("/api/medicos/999999", headers={
            "Authorization": f"Bearer {token_recepcion}"
        })
        assert resp.status_code == 404

    def test_sin_token_rechazado(self, client, usuario_medico):
        _, medico = usuario_medico
        resp = client.get(f"/api/medicos/{medico.id_medico}")
        assert resp.status_code == 401
