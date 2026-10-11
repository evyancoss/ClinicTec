"""
app/models/consulta.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: consultas
PK: id_consulta
FK: id_cita → citas.id_cita  (UNIQUE → 1 consulta por cita)

DISCREPANCIAS con docs/DATABASE.md:
  - PK es `id_consulta`, no `id`.
  - Columna `fecha_consulta` (no `fecha_registro`).
  - Columna `observaciones` (no estaba documentada).
  - NO tiene columna `exploracion` (el campo fue documentado pero no existe).
  - La relación con cita es 1:1 (hay índice UNIQUE en id_cita).
"""

from datetime import datetime
from sqlalchemy import Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .base import ModeloBase


class Consulta(ModeloBase):
    __tablename__ = "consultas"
    __table_args__ = (
        UniqueConstraint("id_cita", name="consultas_id_cita_key"),
    )

    id_consulta:    Mapped[int]           = mapped_column(Integer, primary_key=True)
    id_cita:        Mapped[int]           = mapped_column(
        Integer, ForeignKey("citas.id_cita"), nullable=False, unique=True
    )
    fecha_consulta: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    motivo:         Mapped[str | None]    = mapped_column(Text)
    diagnostico:    Mapped[str | None]    = mapped_column(Text)
    observaciones:  Mapped[str | None]    = mapped_column(Text)
    tratamiento:    Mapped[str | None]    = mapped_column(Text)

    # Relaciones
    cita:    Mapped["Cita"]           = relationship("Cita",   back_populates="consultas")
    recetas: Mapped[list["Receta"]]   = relationship("Receta", back_populates="consulta", lazy="select")

    def to_dict(self) -> dict:
        return {
            "id_consulta":    self.id_consulta,
            "id_cita":        self.id_cita,
            "fecha_consulta": str(self.fecha_consulta) if self.fecha_consulta else None,
            "motivo":         self.motivo,
            "diagnostico":    self.diagnostico,
            "observaciones":  self.observaciones,
            "tratamiento":    self.tratamiento,
        }
