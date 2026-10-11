"""
app/blueprints/medicos.py

Endpoints REST de médicos:
  GET /api/medicos              — listar médicos activos (admin y recepción)
  GET /api/medicos/<id>         — perfil de un médico
  GET /api/medicos/yo           — perfil del médico autenticado (rol medicos)

Permisos:
  - Administrador: listar y consultar todos.
  - Recepción: listar activos y consultar perfil (para asignar citas).
  - Médico: solo puede ver su propio perfil.

Seguridad:
  - El id_medico nunca se toma del cliente para conceder acceso al propio perfil.
  - La asociación usuario→médico se resuelve desde la BD (medicos.id_usuario).
"""

import logging
from flask import Blueprint, g
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models.medico import Medico
from ..schemas.responses import ok, error as err
from ..utils.auth_decorators import (
    requiere_autenticacion,
    requiere_rol,
    requiere_perfil_medico,
)

log = logging.getLogger(__name__)

medicos_bp = Blueprint("medicos", __name__)


def _perfil_publico(medico: Medico) -> dict:
    """Expone información profesional y el nombre de clínica, no IDs internos."""
    return {
        "id_medico": medico.id_medico,
        "id_clinica": medico.id_clinica,
        "nombre_clinica": medico.clinica.nombre,
        "nombre": medico.nombre,
        "ape_paterno": medico.ape_paterno,
        "ape_materno": medico.ape_materno,
        "especialidad": medico.especialidad,
        "telefono": medico.telefono,
        "correo": medico.correo,
        "estado": medico.estado,
    }


# ── GET /api/medicos ──────────────────────────────────────────────────────────

@medicos_bp.get("")
@medicos_bp.get("/")
@requiere_autenticacion
@requiere_rol("administrador", "recepcion")
def listar_medicos():
    """
    Lista médicos activos con nombre, especialidad, clínica y contacto.
    Solo para recepción y administrador (para asignar citas o gestionar).
    """
    medicos = db.session.execute(
        db.select(Medico)
        .options(joinedload(Medico.clinica))
        .where(Medico.estado.is_(True))
        .order_by(Medico.ape_paterno, Medico.nombre)
    ).scalars().all()

    return ok([_perfil_publico(m) for m in medicos])


# ── GET /api/medicos/yo ───────────────────────────────────────────────────────

@medicos_bp.get("/yo")
@requiere_autenticacion
@requiere_perfil_medico
def mi_perfil_medico():
    """
    Devuelve el perfil del médico autenticado.
    El id_medico se obtiene desde la BD, nunca del cliente.
    """
    medico: Medico = g.medico_actual
    return ok(_perfil_publico(medico))


# ── GET /api/medicos/<id> ─────────────────────────────────────────────────────

@medicos_bp.get("/<int:id_medico>")
@requiere_autenticacion
def obtener_medico(id_medico: int):
    """
    Perfil de un médico específico.
    - Admin y recepción: cualquier médico.
    - Médico: solo su propio perfil (verificado contra BD, no contra el parámetro).
    """
    medico = db.session.execute(
        db.select(Medico)
        .options(joinedload(Medico.clinica))
        .where(Medico.id_medico == id_medico)
    ).scalar_one_or_none()
    if not medico or not medico.estado:
        return err("Médico no encontrado.", 404)

    usuario = g.usuario_actual

    if usuario.rol == "medicos":
        # Verificar que el médico solicitado corresponde al usuario autenticado
        medico_propio = db.session.execute(
            db.select(Medico).where(Medico.id_usuario == usuario.id_usuario)
        ).scalar_one_or_none()
        if not medico_propio or medico_propio.id_medico != id_medico:
            return err("Solo puedes consultar tu propio perfil.", 403)

    elif usuario.rol not in ("administrador", "recepcion"):
        return err("Acceso denegado.", 403)

    return ok(_perfil_publico(medico))
