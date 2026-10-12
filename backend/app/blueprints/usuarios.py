"""Endpoints administrativos de usuarios y opciones para sus perfiles."""

import logging

from flask import Blueprint, request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models.clinica import Clinica
from ..models.medico import Medico
from ..models.usuario import Usuario
from ..schemas.responses import error as err, ok
from ..utils.auth_decorators import requiere_autenticacion, requiere_rol
from ..utils.security import hash_password
from ..utils.validators import (
    validar_correo,
    validar_nombre,
    validar_telefono,
    validar_texto,
)

log = logging.getLogger(__name__)
usuarios_bp = Blueprint("usuarios", __name__)

_ROLES_VALIDOS = {"administrador", "recepcion", "medicos"}
_CAMPOS_USUARIO = {
    "nombre", "ape_paterno", "ape_materno", "usuario", "contrasena", "rol",
    "id_clinica", "especialidad", "cedula_profesional", "telefono", "correo",
}
_CAMPOS_MEDICO = {
    "id_clinica", "especialidad", "cedula_profesional", "telefono", "correo",
}


def _validar_usuario(body: dict) -> list[str]:
    errores = [
        f"Campo no permitido: {campo}."
        for campo in body
        if campo not in _CAMPOS_USUARIO
    ]
    validaciones = (
        validar_nombre(body.get("nombre"), "Nombre"),
        validar_nombre(body.get("ape_paterno"), "Apellido paterno"),
        validar_nombre(body.get("ape_materno"), "Apellido materno"),
        validar_texto(body.get("usuario"), "Usuario", max_len=100),
    )
    errores.extend(error for error in validaciones if error)

    contrasena = body.get("contrasena")
    if not isinstance(contrasena, str) or len(contrasena) < 12:
        errores.append("La contraseña debe tener al menos 12 caracteres.")
    elif len(contrasena) > 128:
        errores.append("La contraseña no puede superar 128 caracteres.")

    rol = body.get("rol")
    if not isinstance(rol, str) or rol not in _ROLES_VALIDOS:
        errores.append("Rol inválido.")
    elif rol == "medicos":
        errores.extend(_validar_perfil_medico(body))
    elif _CAMPOS_MEDICO.intersection(body):
        errores.append("Los datos profesionales solo aplican a usuarios médicos.")

    return errores


def _validar_perfil_medico(body: dict) -> list[str]:
    errores = []
    for campo, etiqueta, max_len in (
        ("especialidad", "Especialidad", 100),
        ("cedula_profesional", "Cédula profesional", 50),
    ):
        error = validar_texto(body.get(campo), etiqueta, max_len=max_len)
        if error:
            errores.append(error)

    clinica_id = body.get("id_clinica")
    if isinstance(clinica_id, bool) or not isinstance(clinica_id, int) or clinica_id < 1:
        errores.append("Clínica inválida.")
    else:
        clinica = db.session.get(Clinica, clinica_id)
        if clinica is None:
            errores.append("La clínica seleccionada no existe.")
        elif not clinica.estado:
            errores.append("La clínica seleccionada está inactiva.")

    for campo, validar in (
        ("telefono", validar_telefono),
        ("correo", validar_correo),
    ):
        error = validar(body.get(campo))
        if error:
            errores.append(error)

    return errores


def _usuario_publico(usuario: Usuario) -> dict:
    medico = usuario.medico
    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "ape_paterno": usuario.ape_paterno,
        "ape_materno": usuario.ape_materno,
        "usuario": usuario.usuario,
        "rol": usuario.rol,
        "medico": {
            "id_clinica": medico.id_clinica,
            "nombre_clinica": medico.clinica.nombre,
            "especialidad": medico.especialidad,
            "correo": medico.correo,
            "estado": medico.estado,
        } if medico else None,
    }


@usuarios_bp.get("")
@usuarios_bp.get("/")
@requiere_autenticacion
@requiere_rol("administrador")
def listar_usuarios():
    usuarios = db.session.execute(
        db.select(Usuario)
        .options(joinedload(Usuario.medico).joinedload(Medico.clinica))
        .order_by(Usuario.ape_paterno, Usuario.nombre, Usuario.id_usuario)
    ).scalars().all()
    return ok([_usuario_publico(usuario) for usuario in usuarios])


@usuarios_bp.get("/clinicas")
@requiere_autenticacion
@requiere_rol("administrador")
def listar_clinicas_activas():
    clinicas = db.session.execute(
        db.select(Clinica)
        .where(Clinica.estado.is_(True))
        .order_by(Clinica.nombre)
    ).scalars().all()
    return ok([
        {"id_clinica": clinica.id_clinica, "nombre": clinica.nombre}
        for clinica in clinicas
    ])


@usuarios_bp.post("")
@usuarios_bp.post("/")
@requiere_autenticacion
@requiere_rol("administrador")
def crear_usuario():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not body:
        return err("Se requiere un cuerpo JSON.", 400)

    errores = _validar_usuario(body)
    if errores:
        return err("; ".join(errores), 422)

    usuario_login = body["usuario"].strip()
    if db.session.execute(
        db.select(Usuario.id_usuario).where(Usuario.usuario == usuario_login)
    ).scalar_one_or_none() is not None:
        return err("El nombre de usuario ya está registrado.", 409)

    usuario = Usuario(
        nombre=body["nombre"].strip(),
        ape_paterno=body["ape_paterno"].strip(),
        ape_materno=body["ape_materno"].strip(),
        rol=body["rol"],
        usuario=usuario_login,
        contrasena=hash_password(body["contrasena"]),
    )

    try:
        db.session.add(usuario)
        if usuario.rol == "medicos":
            db.session.flush()
            db.session.add(Medico(
                id_usuario=usuario.id_usuario,
                id_clinica=body["id_clinica"],
                nombre=usuario.nombre,
                ape_paterno=usuario.ape_paterno,
                ape_materno=usuario.ape_materno,
                especialidad=body["especialidad"].strip(),
                cedula_profesional=body["cedula_profesional"].strip(),
                telefono=(body.get("telefono") or "").strip() or None,
                correo=(body.get("correo") or "").strip() or None,
                estado=True,
            ))
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        codigo = getattr(exc.orig, "sqlstate", None) or getattr(
            exc.orig, "pgcode", None
        )
        mensaje = str(exc.orig)
        es_unicidad = codigo == "23505" or (
            exc.orig.__class__.__module__.startswith("sqlite3")
            and "UNIQUE constraint failed" in mensaje
        )
        if es_unicidad:
            return err(
                "El nombre de usuario, la cédula profesional o el perfil médico "
                "ya están registrados.",
                409,
            )
        log.error("Error de integridad al crear usuario: SQLSTATE=%s", codigo)
        return err("Error al guardar el usuario.", 500)
    except Exception as exc:
        db.session.rollback()
        log.error("Error al crear usuario: %s", type(exc).__name__)
        return err("Error al guardar el usuario.", 500)

    return ok(_usuario_publico(usuario), 201)
