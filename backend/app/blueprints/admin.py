"""Indicadores administrativos agregados sin datos identificables de pacientes."""

from datetime import datetime
from zoneinfo import ZoneInfo

from flask import Blueprint, current_app
from sqlalchemy import func

from ..extensions import db
from ..models.cita import Cita
from ..models.clinica import Clinica
from ..models.medico import Medico
from ..models.paciente import Paciente
from ..schemas.responses import ok
from ..utils.auth_decorators import requiere_autenticacion, requiere_rol

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/dashboard")
@requiere_autenticacion
@requiere_rol("administrador")
def dashboard():
    """Devuelve totales actuales. No incluye nombres ni expedientes."""
    zona = ZoneInfo(current_app.config.get("APP_TIMEZONE", "America/Mexico_City"))
    ahora = datetime.now(zona)
    hoy = ahora.date()
    inicio_mes = hoy.replace(day=1)

    citas_hoy = db.session.execute(
        db.select(Cita.id_clinica, Cita.estado, func.count(Cita.id_cita))
        .where(Cita.fecha == hoy)
        .group_by(Cita.id_clinica, Cita.estado)
    ).all()
    citas_clinica: dict[int, int] = {}
    estados: dict[str, int] = {}
    for clinic_id, estado, total in citas_hoy:
        citas_clinica[clinic_id] = citas_clinica.get(clinic_id, 0) + total
        estados[estado] = estados.get(estado, 0) + total

    pacientes_mes = db.session.execute(
        db.select(func.count(Paciente.id_paciente)).where(
            Paciente.fecha_registro >= inicio_mes
        )
    ).scalar_one()
    medicos_activos = db.session.execute(
        db.select(func.count(Medico.id_medico)).where(Medico.estado.is_(True))
    ).scalar_one()
    clinicas = db.session.execute(
        db.select(Clinica).order_by(Clinica.nombre, Clinica.id_clinica)
    ).scalars().all()
    activas = sum(1 for clinic in clinicas if clinic.estado is True)

    actividad = []
    for clinic in clinicas:
        clinic_doctors = db.session.execute(
            db.select(func.count(Medico.id_medico)).where(
                Medico.id_clinica == clinic.id_clinica,
                Medico.estado.is_(True),
            )
        ).scalar_one()
        clinic_patients_today = db.session.execute(
            db.select(func.count(func.distinct(Cita.id_paciente))).where(
                Cita.id_clinica == clinic.id_clinica,
                Cita.fecha == hoy,
            )
        ).scalar_one()
        actividad.append({
            "id_clinica": clinic.id_clinica,
            "nombre": clinic.nombre,
            "activa": clinic.estado is True,
            "citas_hoy": citas_clinica.get(clinic.id_clinica, 0),
            "pacientes_con_cita_hoy": clinic_patients_today,
            "medicos_activos": clinic_doctors,
        })

    return ok({
        "fecha": hoy.isoformat(),
        "resumen": {
            "citas_hoy": sum(citas_clinica.values()),
            "pacientes_nuevos_mes": pacientes_mes,
            "medicos_activos": medicos_activos,
            "clinicas_activas": activas,
        },
        "actividad_por_clinica": actividad,
        "citas_por_estado": [
            {"estado": estado, "total": estados.get(estado, 0)}
            for estado in ("Agendada", "Atendida", "Cancelada", "Reagendada")
        ],
    })
