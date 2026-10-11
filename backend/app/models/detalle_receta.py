"""
app/models/detalle_receta.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: detalle_receta
PK: id_detalle
FK: id_receta → recetas.id_receta

DISCREPANCIAS con docs/DATABASE.md:
  - PK es `id_detalle`, no `id`.
  - Tiene `frecuencia` y `duracion` (no documentadas).
  - Columna `indicaciones` se llama así (no `instrucciones` como se documentó).
  - NO tiene columna `dosis` como campo único — tiene dosis + frecuencia + duracion.
"""

from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import ModeloBase


class DetalleReceta(ModeloBase):
    __tablename__ = "detalle_receta"

    id_detalle:   Mapped[int]          = mapped_column(Integer, primary_key=True)
    id_receta:    Mapped[int]          = mapped_column(
        Integer, ForeignKey("recetas.id_receta"), nullable=False
    )
    medicamento:  Mapped[str]          = mapped_column(String(150), nullable=False)
    dosis:        Mapped[str | None]   = mapped_column(String(100))
    frecuencia:   Mapped[str | None]   = mapped_column(String(100))
    duracion:     Mapped[str | None]   = mapped_column(String(100))
    indicaciones: Mapped[str | None]   = mapped_column(Text)

    # Relaciones
    receta: Mapped["Receta"] = relationship("Receta", back_populates="detalles")

    def to_dict(self) -> dict:
        return {
            "id_detalle":   self.id_detalle,
            "id_receta":    self.id_receta,
            "medicamento":  self.medicamento,
            "dosis":        self.dosis,
            "frecuencia":   self.frecuencia,
            "duracion":     self.duracion,
            "indicaciones": self.indicaciones,
        }
