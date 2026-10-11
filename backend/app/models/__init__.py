"""
app/models/__init__.py
Modelos SQLAlchemy verificados contra el esquema real de Supabase (10-oct-2026).
Ver docs/SCHEMA_REAL.md para columnas y tipos exactos.
"""

from .base import ModeloBase
from .clinica import Clinica
from .usuario import Usuario
from .paciente import Paciente
from .medico import Medico
from .cita import Cita
from .consulta import Consulta
from .receta import Receta
from .detalle_receta import DetalleReceta

__all__ = [
    "ModeloBase",
    "Clinica",
    "Usuario",
    "Paciente",
    "Medico",
    "Cita",
    "Consulta",
    "Receta",
    "DetalleReceta",
]
