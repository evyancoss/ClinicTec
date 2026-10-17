"""Consultas de agenda con alcance limitado por rol y clínica."""

import re
from datetime import date, datetime, time, timedelta

from flask import Blueprint, Response, current_app, g, request
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.cita import Cita
from ..models.clinica import Clinica
from ..models.medico import Medico
from ..models.paciente import Paciente
from ..schemas.responses import error as err, ok
from ..utils.auth_decorators import requiere_autenticacion, requiere_rol
from ..utils.validators import validar_texto

citas_bp = Blueprint("citas", __name__)
_ESTADOS_QUE_BLOQUEAN_HORARIO = ("Agendada", "Atendida")


def _alcance_usuario() -> tuple[int | None, int | None, tuple[Response, int] | None]:
    """Devuelve (clínica, médico) autorizados para leer citas."""
    usuario = g.usuario_actual

    if usuario.rol == "recepcion":
        valor_id = current_app.config.get("RECEPTION_CLINIC_ID")
        if isinstance(valor_id, bool) or valor_id is None:
            return None, None, err(
                "La clínica de recepción no está configurada en el servidor.", 503
            )
        if isinstance(valor_id, int):
            id_clinica = int(valor_id)
        elif isinstance(valor_id, str) and re.fullmatch(r"\d+", valor_id):
            id_clinica = int(valor_id)
        else:
            return None, None, err(
                "La clínica de recepción no está configurada correctamente.", 503
            )
        if id_clinica < 1:
            return None, None, err(
                "La clínica de recepción no está configurada correctamente.", 503
            )

        clinica = db.session.get(Clinica, id_clinica)
        if clinica is None or clinica.estado is not True:
            return None, None, err(
                "La clínica de recepción no existe o está inactiva.", 503
            )
        return id_clinica, None, None

    if usuario.rol == "medicos":
        medico = db.session.execute(
            db.select(Medico).where(Medico.id_usuario == usuario.id_usuario)
        ).scalar_one_or_none()
        if medico is None or medico.estado is not True:
            return None, None, err(
                "El perfil médico no existe o está inactivo.", 403
            )
        return medico.id_clinica, medico.id_medico, None

    return None, None, err("Acceso denegado.", 403)


def _parsear_fecha(valor: object) -> date | None:
    if not isinstance(valor, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", valor):
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        return None


def _parsear_hora(valor: object) -> time | None:
    if not isinstance(valor, str) or not re.fullmatch(r"\d{2}:\d{2}", valor):
        return None
    try:
        return time.fromisoformat(valor)
    except ValueError:
        return None


def _hay_empalme(
    id_medico: int,
    inicio: datetime,
    fin: datetime,
    excluir_id_cita: int | None = None,
) -> bool:
    """Comprueba intersección entre intervalos semiabiertos de 60 minutos."""
    consulta = db.select(Cita).where(
        Cita.id_medico == id_medico,
        Cita.estado.in_(_ESTADOS_QUE_BLOQUEAN_HORARIO),
        Cita.fecha >= inicio.date() - timedelta(days=1),
        Cita.fecha <= fin.date(),
    )
    if excluir_id_cita is not None:
        consulta = consulta.where(Cita.id_cita != excluir_id_cita)

    citas_existentes = db.session.execute(consulta).scalars().all()
    for cita in citas_existentes:
        inicio_existente = datetime.combine(cita.fecha, cita.hora)
        fin_existente = inicio_existente + timedelta(
            minutes=current_app.config["CITA_DURACION_MINUTOS"]
        )
        if inicio < fin_existente and fin > inicio_existente:
            return True
    return False


def _serializar_cita(cita: Cita) -> dict:
    return {
        "id_cita": cita.id_cita,
        "id_paciente": cita.id_paciente,
        "nombre_paciente": cita.paciente.nombre_completo,
        "id_medico": cita.id_medico,
        "nombre_medico": cita.medico.nombre_completo,
        "id_clinica": cita.id_clinica,
        "fecha": cita.fecha.isoformat(),
        "hora": cita.hora.isoformat(timespec="minutes"),
        "motivo": cita.motivo,
        "estado": cita.estado,
    }


def _consulta_en_alcance(id_clinica: int, id_medico: int | None):
    consulta = (
        db.select(Cita)
        .join(Medico, Cita.id_medico == Medico.id_medico)
        .join(Paciente, Cita.id_paciente == Paciente.id_paciente)
        .options(joinedload(Cita.paciente), joinedload(Cita.medico))
        .where(
            Cita.id_clinica == id_clinica,
            Medico.id_clinica == Cita.id_clinica,
        )
    )
    if id_medico is not None:
        consulta = consulta.where(Cita.id_medico == id_medico)
    return consulta


@citas_bp.get("")
@citas_bp.get("/")
@requiere_autenticacion
def listar_citas():
    """Lista citas de una fecha dentro del alcance de clínica o médico."""
    fecha = _parsear_fecha(request.args.get("fecha"))
    if fecha is None:
        return err("Se requiere una fecha válida con formato AAAA-MM-DD.", 422)

    try:
        pagina = int(request.args.get("pagina", "1"))
        por_pagina = int(request.args.get("por_pagina", "20"))
    except (TypeError, ValueError):
        return err("La paginación debe usar números enteros.", 422)
    if pagina < 1 or por_pagina < 1 or por_pagina > 100:
        return err(
            "Página debe ser positiva y por_pagina debe estar entre 1 y 100.", 422
        )

    id_clinica, id_medico, error_acceso = _alcance_usuario()
    if error_acceso:
        return error_acceso

    consulta = _consulta_en_alcance(id_clinica, id_medico).where(Cita.fecha == fecha)
    total = db.session.execute(
        db.select(db.func.count()).select_from(consulta.order_by(None).subquery())
    ).scalar_one()
    citas = db.session.execute(
        consulta.order_by(Cita.hora, Cita.id_cita)
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
    ).scalars().all()

    return ok({
        "citas": [_serializar_cita(cita) for cita in citas],
        "paginacion": {
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total": total,
            "paginas": -(-total // por_pagina),
        },
    })


@citas_bp.get("/<int:id_cita>")
@requiere_autenticacion
def obtener_cita(id_cita: int):
    """Devuelve el detalle básico solo dentro del alcance autorizado."""
    id_clinica, id_medico, error_acceso = _alcance_usuario()
    if error_acceso:
        return error_acceso

    cita = db.session.execute(
        _consulta_en_alcance(id_clinica, id_medico).where(Cita.id_cita == id_cita)
    ).scalar_one_or_none()
    if cita is None:
        return err("Cita no encontrada.", 404)
    return ok(_serializar_cita(cita))


@citas_bp.post("")
@citas_bp.post("crear")
@requiere_autenticacion
@requiere_rol("recepcion")
def crear_cita():
    """Registra una cita de 60 minutos dentro de la clínica operativa."""
    body = request.get_json(silent=True)
    
    campos_permitidos = {
        "id_paciente", "id_medico", "fecha", "hora", "motivo"
    }
    if not isinstance(body, dict) or not body:
        return err("Se requiere un cuerpo JSON.", 400)
    if set(body) - campos_permitidos:
        return err("La solicitud contiene campos no permitidos.", 422)
    
    id_paciente = body.get("id_paciente")
    id_medico = body.get("id_medico")
    if (
        isinstance(id_paciente, bool)
        or not isinstance(id_paciente, int)
        or id_paciente < 1
    ):
        return err("Paciente inválido.", 422)
    if (
        isinstance(id_medico, bool)
        or not isinstance(id_medico, int)
        or id_medico < 1
    ):
        return err("Médico inválido.", 422)

    fecha = _parsear_fecha(body.get("fecha"))
    hora = _parsear_hora(body.get("hora"))
    if fecha is None:
        return err("Fecha inválida. Use el formato AAAA-MM-DD.", 422)
    if hora is None:
        return err("Hora inválida. Use el formato HH:MM.", 422)
    motivo = body.get("motivo")
    if motivo is not None:
        error_motivo = validar_texto(
            motivo, "Motivo", max_len=255, requerido=False
        )
        if error_motivo:
            return err(error_motivo, 422)

    id_clinica, _, error_acceso = _alcance_usuario()
    if error_acceso:
        return error_acceso

    paciente = db.session.get(Paciente, id_paciente)
    if paciente is None or paciente.estado is not True:
        return err("Paciente no encontrado o inactivo.", 404)

    inicio = datetime.combine(fecha, hora)
    fin = inicio + timedelta(minutes=current_app.config["CITA_DURACION_MINUTOS"])

    try:
        medico = db.session.execute(
            db.select(Medico)
            .where(Medico.id_medico == id_medico)
            .with_for_update()
        ).scalar_one_or_none()
        if medico is None or medico.estado is not True:
            db.session.rollback()
            return err("Médico no encontrado o inactivo.", 404)
        if medico.id_clinica != id_clinica:
            db.session.rollback()
            return err("El médico no pertenece a la clínica operativa.", 422)

        clinica = db.session.get(Clinica, id_clinica)
        if clinica is None or clinica.estado is not True:
            db.session.rollback()
            return err("La clínica operativa no existe o está inactiva.", 503)

        if _hay_empalme(id_medico, inicio, fin):
            db.session.rollback()
            return err("El médico ya tiene una cita que se empalma con ese horario.", 409)

        cita = Cita(
            id_paciente=id_paciente,
            id_medico=id_medico,
            id_clinica=id_clinica,
            fecha=fecha,
            hora=hora,
            motivo=(motivo or "").strip() or None,
            estado="Agendada",
        )
        db.session.add(cita)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return err("No se pudo registrar la cita por un conflicto de integridad.", 409)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Error al registrar cita: %s", type(exc).__name__)
        return err("No se pudo registrar la cita.", 500)

    return ok(_serializar_cita(cita), 201)


@citas_bp.post("/<int:id_cita>/cancelar")
@requiere_autenticacion
@requiere_rol("recepcion")
def cancelar_cita(id_cita: int):
    """Cancela una cita agendada dentro de la clínica asignada en el servidor."""
    body = request.get_json(silent=True)
    if body is not None and (not isinstance(body, dict) or body):
        return err("La cancelación no acepta campos en la solicitud.", 422)

    id_clinica, _, error_acceso = _alcance_usuario()
    if error_acceso:
        return error_acceso

    cita = db.session.execute(
        _consulta_en_alcance(id_clinica, None).where(Cita.id_cita == id_cita)
    ).scalar_one_or_none()
    if cita is None:
        return err("Cita no encontrada.", 404)

    try:
        medico = db.session.execute(
            db.select(Medico)
            .where(Medico.id_medico == cita.id_medico)
            .with_for_update()
        ).scalar_one_or_none()
        if medico is None or medico.id_clinica != id_clinica:
            db.session.rollback()
            return err("Cita no encontrada.", 404)

        cita = db.session.execute(
            _consulta_en_alcance(id_clinica, None)
            .where(Cita.id_cita == id_cita)
            .with_for_update(of=Cita)
        ).scalar_one_or_none()
        if cita is None:
            db.session.rollback()
            return err("Cita no encontrada.", 404)
        if cita.estado != "Agendada":
            db.session.rollback()
            return err("Solo se pueden cancelar citas con estado Agendada.", 409)

        cita.estado = "Cancelada"
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error("Error al cancelar cita: %s", type(exc).__name__)
        return err("No se pudo cancelar la cita.", 500)

    return ok(_serializar_cita(cita))
