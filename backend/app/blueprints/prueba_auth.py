"""
app/blueprints/prueba_auth.py
Blueprint registrado SOLO cuando TESTING=True.
Expone rutas de prueba para verificar los decoradores de autorización.
NO incluir en producción.
"""

from flask import Blueprint, g, jsonify
from ..utils.auth_decorators import (
    requiere_autenticacion,
    requiere_rol,
    requiere_perfil_medico,
)

prueba_auth_bp = Blueprint("prueba_auth", __name__)


@prueba_auth_bp.get("/prueba/solo-autenticado")
@requiere_autenticacion
def solo_autenticado():
    return jsonify({"ok": True, "usuario": g.usuario_actual.usuario})


@prueba_auth_bp.get("/prueba/solo-admin")
@requiere_autenticacion
@requiere_rol("administrador")
def solo_admin():
    return jsonify({"ok": True})


@prueba_auth_bp.get("/prueba/admin-o-recepcion")
@requiere_autenticacion
@requiere_rol("administrador", "recepcion")
def admin_o_recepcion():
    return jsonify({"ok": True})


@prueba_auth_bp.get("/prueba/solo-medico")
@requiere_autenticacion
@requiere_perfil_medico
def solo_medico():
    return jsonify({"ok": True, "id_medico": g.medico_actual.id_medico})
