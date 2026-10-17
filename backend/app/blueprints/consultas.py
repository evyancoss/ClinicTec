"""Registro de consultas y recetas para el médico asignado a la cita."""

import logging

from flask import Blueprint, g, request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.cita import Cita
from ..models.consulta import Consulta
from ..models.detalle_receta import DetalleReceta
from ..models.medico import Medico
from ..models.receta import Receta
from ..schemas.responses import error as err, ok
from ..utils.auth_decorators import requiere_autenticacion, requiere_perfil_medico

log = logging.getLogger(__name__)

consultas_bp = Blueprint("consultas", __name__)

_CAMPOS_CONSULTA = {"motivo", "diagnostico", "observaciones", "tratamiento"}
_CAMPOS_RECETA = {"indicaciones", "detalles"}
_CAMPOS_DETALLE = {
    "medicamento", "dosis", "frecuencia", "duracion", "indicaciones"
}
_MAX_TEXTO_CLINICO = 10_000


def _texto_opcional(
    valor: object, campo: str, max_len: int = _MAX_TEXTO_CLINICO
) -> tuple[str | None, str | None]:
    if valor is None:
        return None, None
    if not isinstance(valor, str):
        return None, f"{campo} debe ser texto."
    valor = valor.strip()
    if len(valor) > max_len:
        return None, f"{campo} no puede superar {max_len} caracteres."
    return valor or None, None


def _cita_medico_bloqueada(id_cita: int, medico: Medico) -> Cita | None:
    """Toma primero el bloqueo del médico, igual que el flujo de citas."""
    db.session.execute(
        select(Medico)
        .where(Medico.id_medico == medico.id_medico)
        .with_for_update()
    ).scalar_one()
    cita = db.session.execute(
        select(Cita)
        .where(Cita.id_cita == id_cita)
        .with_for_update()
    ).scalar_one_or_none()
    if (
        cita is None
        or cita.id_medico != medico.id_medico
        or cita.id_clinica != medico.id_clinica
    ):
        return None
    return cita


def _serializar_receta(receta: Receta) -> dict:
    return {
        **receta.to_dict(),
        "detalles": [detalle.to_dict() for detalle in receta.detalles],
    }


def _serializar_consulta(consulta: Consulta) -> dict:
    return {
        **consulta.to_dict(),
        "recetas": [_serializar_receta(receta) for receta in consulta.recetas],
    }


@consultas_bp.post("/citas/<int:id_cita>/consulta")
@requiere_autenticacion
@requiere_perfil_medico
def registrar_consulta(id_cita: int):
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not body:
        return err("Se requiere un cuerpo JSON.", 400)
    if set(body) - _CAMPOS_CONSULTA:
        return err("La solicitud contiene campos no permitidos.", 422)

    valores: dict[str, str | None] = {}
    for campo in _CAMPOS_CONSULTA:
        valor, error = _texto_opcional(body.get(campo), campo.capitalize())
        if error:
            return err(error, 422)
        valores[campo] = valor
    if not any(valores.values()):
        return err("Registra al menos un dato clínico.", 422)

    medico = g.medico_actual
    try:
        cita = _cita_medico_bloqueada(id_cita, medico)
        if cita is None:
            db.session.rollback()
            return err("Cita no encontrada.", 404)
        if cita.estado != "Agendada":
            db.session.rollback()
            return err("Solo se puede atender una cita Agendada.", 409)
        if db.session.execute(
            select(Consulta.id_consulta).where(Consulta.id_cita == cita.id_cita)
        ).scalar_one_or_none() is not None:
            db.session.rollback()
            return err("La cita ya tiene una consulta registrada.", 409)

        consulta = Consulta(id_cita=cita.id_cita, **valores)
        cita.estado = "Atendida"
        db.session.add(consulta)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return err("La cita ya tiene una consulta registrada.", 409)
    except Exception as exc:
        db.session.rollback()
        log.error("Error al registrar consulta: %s", type(exc).__name__)
        return err("No se pudo registrar la consulta.", 500)

    return ok(_serializar_consulta(consulta), 201)


@consultas_bp.post("/consultas/<int:id_consulta>/recetas")
@requiere_autenticacion
@requiere_perfil_medico
def emitir_receta(id_consulta: int):
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not body:
        return err("Se requiere un cuerpo JSON.", 400)
    if set(body) - _CAMPOS_RECETA:
        return err("La solicitud contiene campos no permitidos.", 422)
    if "detalles" not in body or not isinstance(body["detalles"], list):
        return err("Se requiere una lista de medicamentos.", 422)
    if not body["detalles"]:
        return err("La receta requiere al menos un medicamento.", 422)

    indicaciones, error = _texto_opcional(
        body.get("indicaciones"), "Indicaciones"
    )
    if error:
        return err(error, 422)

    detalles: list[dict[str, str | None]] = []
    limites = {
        "medicamento": 150,
        "dosis": 100,
        "frecuencia": 100,
        "duracion": 100,
        "indicaciones": _MAX_TEXTO_CLINICO,
    }
    for indice, detalle in enumerate(body["detalles"], start=1):
        if not isinstance(detalle, dict):
            return err(f"El medicamento {indice} debe ser un objeto.", 422)
        if set(detalle) - _CAMPOS_DETALLE:
            return err(
                f"El medicamento {indice} contiene campos no permitidos.", 422
            )
        medicamento, error = _texto_opcional(
            detalle.get("medicamento"),
            f"Medicamento {indice}",
            limites["medicamento"],
        )
        if error or medicamento is None:
            return err(error or f"Medicamento {indice} es requerido.", 422)
        valores_detalle: dict[str, str | None] = {"medicamento": medicamento}
        for campo in _CAMPOS_DETALLE - {"medicamento"}:
            valor, error = _texto_opcional(
                detalle.get(campo), f"{campo.capitalize()} {indice}",
                limites[campo],
            )
            if error:
                return err(error, 422)
            valores_detalle[campo] = valor
        detalles.append(valores_detalle)

    medico = g.medico_actual
    try:
        id_cita = db.session.execute(
            select(Consulta.id_cita).where(
                Consulta.id_consulta == id_consulta
            )
        ).scalar_one_or_none()
        if id_cita is None:
            db.session.rollback()
            return err("Consulta no encontrada.", 404)

        cita = _cita_medico_bloqueada(id_cita, medico)
        if cita is None:
            db.session.rollback()
            return err("Consulta no encontrada.", 404)
        consulta = db.session.execute(
            select(Consulta)
            .where(Consulta.id_consulta == id_consulta)
            .with_for_update()
        ).scalar_one_or_none()
        if consulta is None or consulta.id_cita != cita.id_cita:
            db.session.rollback()
            return err("Consulta no encontrada.", 404)

        receta = Receta(id_consulta=consulta.id_consulta, indicaciones=indicaciones)
        db.session.add(receta)
        db.session.flush()
        db.session.add_all([
            DetalleReceta(id_receta=receta.id_receta, **detalle)
            for detalle in detalles
        ])
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return err("No se pudo emitir la receta por un conflicto de integridad.", 409)
    except Exception as exc:
        db.session.rollback()
        log.error("Error al emitir receta: %s", type(exc).__name__)
        return err("No se pudo emitir la receta.", 500)

    return ok(_serializar_receta(receta), 201)
