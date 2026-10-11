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

from ..extensions import db
from ..models.paciente import Paciente
from ..models.cita import Cita
from ..schemas.responses import ok, error as err
from ..utils.auth_decorators import (
    requiere_autenticacion,
    requiere_rol,
    requiere_perfil_medico,
)
from ..utils.validators import (
    validar_nombre,
    validar_fecha_nacimiento,
    validar_sexo,
    validar_telefono,
    validar_correo,
    validar_texto,
    parse_paginacion,
)

log = logging.getLogger(__name__)

pacientes_bp = Blueprint("pacientes", __name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _validar_campos_paciente(body: dict, nuevo: bool = True) -> list[str]:
    """Valida el body de creación/edición. Devuelve lista de errores."""
    errores = []

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

    direccion = body.get("direccion")
    if direccion:
        _add(validar_texto(direccion, "Dirección", max_len=255, requerido=False))

    return errores


def _ids_pacientes_del_medico(id_medico: int) -> set[int]:
    """Devuelve los id_paciente de citas asignadas al médico."""
    filas = db.session.execute(
        db.select(Cita.id_paciente).where(Cita.id_medico == id_medico).distinct()
    ).all()
    return {fila[0] for fila in filas}


# ── GET /api/pacientes ────────────────────────────────────────────────────────

@pacientes_bp.get("")
@pacientes_bp.get("/")
@requiere_autenticacion
@requiere_rol("administrador", "recepcion")
def listar_pacientes():
    """
    Lista pacientes con paginación y búsqueda por nombre/apellidos.
    Query params: pagina, por_pagina, busqueda
    Solo accesible para recepción y administrador.
    """
    pagina, por_pagina = parse_paginacion(request.args)
    busqueda = (request.args.get("busqueda") or "").strip()

    query = db.select(Paciente).where(Paciente.estado.is_(True))

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
        "pacientes": [p.to_dict() for p in pacientes],
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
    if not body:
        return err("Se requiere un cuerpo JSON.", 400)

    errores = _validar_campos_paciente(body, nuevo=True)
    if errores:
        return err(errores[0] if len(errores) == 1 else errores, 422)

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
    except Exception as exc:
        db.session.rollback()
        log.error("Error al crear paciente: %s", type(exc).__name__)
        return err("Error al guardar el paciente. Intenta de nuevo.", 500)

    return ok(paciente.to_dict(), 201)


# ── GET /api/pacientes/<id> ───────────────────────────────────────────────────

@pacientes_bp.get("/<int:id_paciente>")
@requiere_autenticacion
def obtener_paciente(id_paciente: int):
    """
    Detalle de un paciente.
    - Recepción/admin: cualquier paciente activo.
    - Médico: solo si tiene al menos una cita con ese paciente.
    """
    paciente = db.session.get(Paciente, id_paciente)
    if not paciente or not paciente.estado:
        return err("Paciente no encontrado.", 404)

    usuario = g.usuario_actual

    # Médico: verificar que el paciente le corresponde
    if usuario.rol == "medicos":
        from ..models.medico import Medico
        medico = db.session.execute(
            db.select(Medico).where(Medico.id_usuario == usuario.id_usuario)
        ).scalar_one_or_none()
        if not medico:
            return err("Perfil médico no encontrado.", 403)
        ids_autorizados = _ids_pacientes_del_medico(medico.id_medico)
        if id_paciente not in ids_autorizados:
            return err("No tienes autorización para ver este paciente.", 403)

    elif usuario.rol not in ("administrador", "recepcion"):
        return err("Acceso denegado.", 403)

    return ok(paciente.to_dict())


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
    if not body:
        return err("Se requiere un cuerpo JSON.", 400)

    errores = _validar_campos_paciente(body, nuevo=False)
    if errores:
        return err(errores[0] if len(errores) == 1 else errores, 422)

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

    return ok(paciente.to_dict())


# ── GET /api/pacientes/<id>/historial ─────────────────────────────────────────

@pacientes_bp.get("/<int:id_paciente>/historial")
@requiere_autenticacion
def historial_paciente(id_paciente: int):
    """
    Stub preparado para la Fase 7 (consultas y recetas).
    Actualmente devuelve la lista de citas del paciente.
    El médico solo puede ver su propio historial de citas con ese paciente.
    """
    paciente = db.session.get(Paciente, id_paciente)
    if not paciente or not paciente.estado:
        return err("Paciente no encontrado.", 404)

    usuario = g.usuario_actual
    query = db.select(Cita).where(Cita.id_paciente == id_paciente)

    if usuario.rol == "medicos":
        from ..models.medico import Medico
        medico = db.session.execute(
            db.select(Medico).where(Medico.id_usuario == usuario.id_usuario)
        ).scalar_one_or_none()
        if not medico:
            return err("Perfil médico no encontrado.", 403)
        # Filtrar solo citas de este médico
        query = query.where(Cita.id_medico == medico.id_medico)
    elif usuario.rol not in ("administrador", "recepcion"):
        return err("Acceso denegado.", 403)

    citas = db.session.execute(
        query.order_by(Cita.fecha.desc(), Cita.hora.desc())
    ).scalars().all()

    return ok({
        "paciente":   paciente.to_dict(),
        "citas":      [c.to_dict() for c in citas],
        "nota":       "Consultas y recetas disponibles en Fase 7.",
    })
