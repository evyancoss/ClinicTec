"""
app/models/clinica.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: clinicas
PK: id_clinica
"""

from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import ModeloBase


class Clinica(ModeloBase):
    __tablename__ = "clinicas"

    id_clinica: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre:     Mapped[str] = mapped_column(String(150), nullable=False)
    direccion:  Mapped[str] = mapped_column(String(255), nullable=False)
    telefono:   Mapped[str | None] = mapped_column(String(20))
    correo:     Mapped[str | None] = mapped_column(String(100))
    estado:     Mapped[bool | None] = mapped_column(Boolean, default=True)

    # Relaciones
    medicos:   Mapped[list["Medico"]]   = relationship("Medico",   back_populates="clinica", lazy="select")
    citas:     Mapped[list["Cita"]]     = relationship("Cita",     back_populates="clinica", lazy="select")

    def to_dict(self) -> dict:
        return {
            "id_clinica": self.id_clinica,
            "nombre":     self.nombre,
            "direccion":  self.direccion,
            "telefono":   self.telefono,
            "correo":     self.correo,
            "estado":     self.estado,
        }
