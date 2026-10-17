"""Consulta administrativa de clínicas con conteos agregados."""

from flask import Blueprint
from sqlalchemy import func

from ..extensions import db
from ..models.cita import Cita
from ..models.clinica import Clinica
from ..models.medico import Medico
from ..schemas.responses import ok
from ..utils.auth_decorators import requiere_autenticacion, requiere_rol

clinicas_bp = Blueprint("clinicas", __name__)


@clinicas_bp.get("")
@clinicas_bp.get("/")
@requiere_autenticacion
@requiere_rol("administrador")
def listar_clinicas():
    """Lista clínicas y métricas agregadas; nunca devuelve registros de pacientes."""
    clinicas = db.session.execute(
        db.select(Clinica).order_by(Clinica.nombre, Clinica.id_clinica)
    ).scalars().all()
    resultado = []
    for clinica in clinicas:
        medicos = db.session.execute(
            db.select(func.count(Medico.id_medico)).where(
                Medico.id_clinica == clinica.id_clinica,
                Medico.estado.is_(True),
            )
        ).scalar_one()
        pacientes = db.session.execute(
            db.select(func.count(func.distinct(Cita.id_paciente))).where(
                Cita.id_clinica == clinica.id_clinica,
            )
        ).scalar_one()
        resultado.append({
            "id_clinica": clinica.id_clinica,
            "nombre": clinica.nombre,
            "direccion": clinica.direccion,
            "telefono": clinica.telefono,
            "activa": clinica.estado is True,
            "medicos_activos": medicos,
            "pacientes_con_cita": pacientes,
        })
    return ok(resultado)
