"""
app/blueprints/pacientes.py

Endpoints REST de pacientes:
  GET    /api/pacientes              — listar con paginación y búsqueda
  POST   /api/pacientes              — registrar nuevo paciente
  GET    /api/pacientes/<id>         — detalle de un paciente
  PUT    /api/pacientes/<id>         — editar datos de un paciente
  GET    /api/pacientes/<id>/historial — stub preparado para Fase 7

Permisos:
  - Recepción y administrador: listar, crear, editar, consultar.
  - Médico: solo puede consultar pacientes vinculados a sus propias citas.
  - No se permite borrado físico.

Reglas:
  - El id_paciente nunca se acepta del cliente para conceder acceso.
  - El filtro por médico se aplica en el servidor, no en el cliente.
"""

import logging
from datetime import date as _date
from flask import Blueprint, g, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.paciente import Paciente
from ..models.cita import Cita
from ..models.medico import Medico
from ..schemas.responses import ok, error as err
from ..utils.auth_decorators import (
    requiere_autenticacion,
    requiere_rol,
)
from ..utils.validators import (
    validar_nombre,
    validar_fecha_nacimiento,
    validar_sexo,
    validar_telefono,
    validar_correo,
    validar_texto,
)

log = logging.getLogger(__name__)

pacientes_bp = Blueprint("pacientes", __name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

_CAMPOS_PACIENTE = {
    "nombre", "ape_paterno", "ape_materno", "fecha_nacimiento",
    "sexo", "telefono", "correo", "direccion",
}


def _validar_campos_paciente(body: dict) -> list[str]:
    """Valida el body de creación/edición. Devuelve lista de errores."""
    errores = [
        f"Campo no permitido: {campo}."
        for campo in body
        if campo not in _CAMPOS_PACIENTE
    ]

    def _add(e): 
        if e: 
            errores.append(e)

    _add(validar_nombre(body.get("nombre"), "Nombre"))
    _add(validar_nombre(body.get("ape_paterno"), "Apellido paterno"))
    _add(validar_nombre(body.get("ape_materno"), "Apellido materno"))
    _add(validar_fecha_nacimiento(body.get("fecha_nacimiento")))
    _add(validar_sexo(body.get("sexo")))
    _add(validar_telefono(body.get("telefono")))
    _add(validar_correo(body.get("correo")))

    if "direccion" in body:
        _add(validar_texto(
            body["direccion"], "Dirección", max_len=255, requerido=False
        ))

    return errores


def _serializar_paciente(paciente: Paciente, medico: bool = False) -> dict:
    """Devuelve solo los datos básicos necesarios para el rol solicitante."""
    datos = paciente.to_dict()
    datos.pop("fecha_registro", None)
    datos.pop("estado", None)
    if medico:
        datos.pop("direccion", None)
    return datos


def _medico_del_usuario(usuario_id: int) -> Medico | None:
    return db.session.execute(
        db.select(Medico).where(Medico.id_usuario == usuario_id)
    ).scalar_one_or_none()


def _es_json_objeto(body) -> bool:
    return isinstance(body, dict) and bool(body)


def _registrar_integrity_error(operacion: str, exc: IntegrityError) -> None:
    """Registra solo códigos y nombres de esquema, nunca SQL ni parámetros."""
    original = exc.orig
    diagnostico = getattr(original, "diag", None)

    def _metadato(objeto, campo: str, max_len: int = 128) -> str | None:
        valor = getattr(objeto, campo, None)
        return valor[:max_len] if isinstance(valor, str) and valor else None

    log.error(
        "Error de integridad al %s paciente",
        operacion,
        extra={
            "sqlstate": (
                _metadato(original, "sqlstate", 5)
                or _metadato(original, "pgcode", 5)
            ),
            "constraint_name": _metadato(diagnostico, "constraint_name"),
            "schema_name": _metadato(diagnostico, "schema_name"),
            "table_name": _metadato(diagnostico, "table_name"),
            "column_name": _metadato(diagnostico, "column_name"),
        },
    )


# ── GET /api/pacientes ────────────────────────────────────────────────────────

@pacientes_bp.get("")
@pacientes_bp.get("/")
@requiere_autenticacion
def listar_pacientes():
    """
    Lista pacientes con paginación y búsqueda por nombre/apellidos.
    Query params: pagina, por_pagina, busqueda
    Los médicos solo reciben pacientes asociados a sus propias citas.
    """
    try:
        pagina = int(request.args.get("pagina", "1"))
        por_pagina = int(request.args.get("por_pagina", "20"))
    except (TypeError, ValueError):
        return err("La paginación debe usar números enteros.", 422)
    if pagina < 1 or por_pagina < 1 or por_pagina > 100:
        return err("Página debe ser positiva y por_pagina debe estar entre 1 y 100.", 422)

    busqueda = (request.args.get("busqueda") or "").strip()
    if len(busqueda) > 100:
        return err("La búsqueda no puede superar 100 caracteres.", 422)

    query = db.select(Paciente).where(Paciente.estado.is_(True))
    usuario = g.usuario_actual
    es_medico = usuario.rol == "medicos"

    if es_medico:
        medico = _medico_del_usuario(usuario.id_usuario)
        if medico is None or not medico.estado:
            return err("Perfil médico no encontrado o inactivo.", 403)
        query = (
            query.join(Cita, Cita.id_paciente == Paciente.id_paciente)
            .where(Cita.id_medico == medico.id_medico)
            .distinct()
        )
    elif usuario.rol not in ("administrador", "recepcion"):
        return err("Acceso denegado.", 403)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.where(
            db.or_(
                Paciente.nombre.ilike(termino),
                Paciente.ape_paterno.ilike(termino),
                Paciente.ape_materno.ilike(termino),
            )
        )

    query = query.order_by(Paciente.ape_paterno, Paciente.nombre)

    # Contar total para la paginación
    total = db.session.execute(
        db.select(db.func.count()).select_from(query.subquery())
    ).scalar()

    # Aplicar paginación
    pacientes = db.session.execute(
        query.offset((pagina - 1) * por_pagina).limit(por_pagina)
    ).scalars().all()

    return ok({
        "pacientes": [
            _serializar_paciente(p, medico=es_medico) for p in pacientes
        ],
        "paginacion": {
            "pagina":      pagina,
            "por_pagina":  por_pagina,
            "total":       total,
            "paginas":     -(-total // por_pagina),  # ceil division
        },
    })


# ── POST /api/pacientes ───────────────────────────────────────────────────────

@pacientes_bp.post("")
@pacientes_bp.post("/")
@requiere_autenticacion
@requiere_rol("administrador", "recepcion")
def crear_paciente():
    """Registra un nuevo paciente. Solo recepción y administrador."""
    body = request.get_json(silent=True)
    if not _es_json_objeto(body):
        return err("Se requiere un cuerpo JSON.", 400)

    errores = _validar_campos_paciente(body)
    if errores:
        return err("; ".join(errores), 422)

    paciente = Paciente(
        nombre=body["nombre"].strip(),
        ape_paterno=body["ape_paterno"].strip(),
        ape_materno=body["ape_materno"].strip(),
        fecha_nacimiento=_date.fromisoformat(body["fecha_nacimiento"]),
        sexo=body["sexo"],
        telefono=(body.get("telefono") or "").strip() or None,
        correo=(body.get("correo") or "").strip() or None,
        direccion=(body.get("direccion") or "").strip() or None,
        estado=True,
    )

    try:
        db.session.add(paciente)
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        _registrar_integrity_error("crear", exc)
        return err("Error al guardar el paciente. Intenta de nuevo.", 500)
    except Exception as exc:
        db.session.rollback()
        log.error("Error al crear paciente: %s", type(exc).__name__)
        return err("Error al guardar el paciente. Intenta de nuevo.", 500)

    return ok(_serializar_paciente(paciente), 201)

# ── GET /api/pacientes/<id> ───────────────────────────────────────────────────

@pacientes_bp.get("/<int:id_paciente>")
@requiere_autenticacion
def obtener_paciente(id_paciente: int):
    """
    Detalle de un paciente.
    - Recepción/admin: cualquier paciente activo.
    - Médico: solo si tiene al menos una cita con ese paciente.
    """
    usuario = g.usuario_actual
    es_medico = usuario.rol == "medicos"

    if es_medico:
        medico = _medico_del_usuario(usuario.id_usuario)
        if medico is None or not medico.estado:
            return err("Perfil médico no encontrado o inactivo.", 403)
        paciente = db.session.execute(
            db.select(Paciente)
            .join(Cita, Cita.id_paciente == Paciente.id_paciente)
            .where(
                Paciente.id_paciente == id_paciente,
                Paciente.estado.is_(True),
                Cita.id_medico == medico.id_medico,
            )
            .limit(1)
        ).scalar_one_or_none()
        if paciente is None:
            return err("No tienes autorización para ver este paciente.", 403)

    elif usuario.rol in ("administrador", "recepcion"):
        paciente = db.session.get(Paciente, id_paciente)
        if not paciente or not paciente.estado:
            return err("Paciente no encontrado.", 404)
    else:
        return err("Acceso denegado.", 403)

    return ok(_serializar_paciente(paciente, medico=es_medico))


# ── PUT /api/pacientes/<id> ───────────────────────────────────────────────────

@pacientes_bp.put("/<int:id_paciente>")
@requiere_autenticacion
@requiere_rol("administrador", "recepcion")
def editar_paciente(id_paciente: int):
    """Edita datos básicos de un paciente. Solo recepción y administrador."""
    paciente = db.session.get(Paciente, id_paciente)
    if not paciente or not paciente.estado:
        return err("Paciente no encontrado.", 404)

    body = request.get_json(silent=True)
    if not _es_json_objeto(body):
        return err("Se requiere un cuerpo JSON.", 400)

    errores = _validar_campos_paciente(body)
    if errores:
        return err("; ".join(errores), 422)

    # Actualizar solo campos presentes en el body
    campos = ["nombre", "ape_paterno", "ape_materno",
              "fecha_nacimiento", "sexo", "telefono", "correo", "direccion"]
    for campo in campos:
        if campo in body:
            valor = body[campo]
            if campo == "fecha_nacimiento" and isinstance(valor, str):
                valor = _date.fromisoformat(valor)
            elif isinstance(valor, str):
                valor = valor.strip() or None
            setattr(paciente, campo, valor)

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        log.error("Error al editar paciente: %s", type(exc).__name__)
        return err("Error al actualizar el paciente.", 500)

    return ok(_serializar_paciente(paciente))


# ── GET /api/pacientes/<id>/historial ─────────────────────────────────────────

@pacientes_bp.get("/<int:id_paciente>/historial")
@requiere_autenticacion
def historial_paciente(id_paciente: int):
    """
    Stub preparado para la Fase 7 (consultas y recetas).
    Mantiene el control de acceso sin exponer citas ni datos clínicos antes de Fase 7.
    El médico solo puede ver su propio historial de citas con ese paciente.
    """
    usuario = g.usuario_actual
    if usuario.rol == "medicos":
        medico = _medico_del_usuario(usuario.id_usuario)
        if medico is None or not medico.estado:
            return err("Perfil médico no encontrado o inactivo.", 403)
        paciente = db.session.execute(
            db.select(Paciente)
            .join(Cita, Cita.id_paciente == Paciente.id_paciente)
            .where(
                Paciente.id_paciente == id_paciente,
                Paciente.estado.is_(True),
                Cita.id_medico == medico.id_medico,
            )
            .limit(1)
        ).scalar_one_or_none()
        if paciente is None:
            return err("No tienes autorización para ver este paciente.", 403)
    elif usuario.rol not in ("administrador", "recepcion"):
        return err("Acceso denegado.", 403)
    else:
        paciente = db.session.get(Paciente, id_paciente)
        if not paciente or not paciente.estado:
            return err("Paciente no encontrado.", 404)

    return ok({
        "paciente": _serializar_paciente(
            paciente, medico=usuario.rol == "medicos"
        ),
        "citas": [],
        "nota": "El historial clínico se implementará en Fase 7.",
    })
