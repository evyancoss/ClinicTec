"""
app/models/receta.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: recetas
PK: id_receta
FK: id_consulta → consultas.id_consulta

DISCREPANCIAS con docs/DATABASE.md:
  - PK es `id_receta`, no `id`.
  - Columna `fecha_receta` (no `fecha_emision`).
  - Tiene columna `indicaciones` generales de la receta.
"""

from datetime import datetime
from sqlalchemy import Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .base import ModeloBase


class Receta(ModeloBase):
    __tablename__ = "recetas"

    id_receta:   Mapped[int]           = mapped_column(Integer, primary_key=True)
    id_consulta: Mapped[int]           = mapped_column(
        Integer, ForeignKey("consultas.id_consulta"), nullable=False
    )
    fecha_receta: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    indicaciones: Mapped[str | None]   = mapped_column(Text)

    # Relaciones
    consulta: Mapped["Consulta"]              = relationship("Consulta", back_populates="recetas")
    detalles: Mapped[list["DetalleReceta"]]   = relationship(
        "DetalleReceta", back_populates="receta", lazy="select"
    )

    def to_dict(self) -> dict:
        return {
            "id_receta":    self.id_receta,
            "id_consulta":  self.id_consulta,
            "fecha_receta": str(self.fecha_receta) if self.fecha_receta else None,
            "indicaciones": self.indicaciones,
        }
