"""
app/schemas/responses.py
Funciones helper para construir respuestas JSON consistentes.
Formato: { data, error, status }
"""

from flask import jsonify
from typing import Any


def ok(data: Any, status: int = 200):
    """Respuesta exitosa."""
    return jsonify({"data": data, "error": None, "status": status}), status


def error(message: str, status: int = 400):
    """Respuesta de error."""
    return jsonify({"data": None, "error": message, "status": status}), status
