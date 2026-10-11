"""
app/models/paciente.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: pacientes
PK: id_paciente

DISCREPANCIAS con docs/DATABASE.md:
  - Tiene ape_paterno y ape_materno separados (no una sola columna `nombre`).
  - Tiene columna `sexo` (no estaba documentada).
  - Tiene `correo` y `direccion` (no estaban documentadas).
  - NO tiene columna `numero_expediente` (el PK es el expediente implícito).
  - La clínica del paciente NO está en esta tabla —
    se infiere a través de las citas (paciente → cita → clinica).
"""

from datetime import datetime, date
from sqlalchemy import String, Boolean, Integer, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .base import ModeloBase


class Paciente(ModeloBase):
    __tablename__ = "pacientes"

    id_paciente:     Mapped[int]         = mapped_column(Integer, primary_key=True)
    nombre:          Mapped[str]         = mapped_column(String(100), nullable=False)
    ape_paterno:     Mapped[str]         = mapped_column(String(100), nullable=False)
    ape_materno:     Mapped[str]         = mapped_column(String(100), nullable=False)
    fecha_nacimiento: Mapped[date]       = mapped_column(Date, nullable=False)
    sexo:            Mapped[str]         = mapped_column(String(10),  nullable=False)
    telefono:        Mapped[str | None]  = mapped_column(String(20))
    correo:          Mapped[str | None]  = mapped_column(String(100))
    direccion:       Mapped[str | None]  = mapped_column(String(255))
    fecha_registro:  Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    estado:          Mapped[bool | None] = mapped_column(Boolean, default=True)

    # Relaciones
    citas: Mapped[list["Cita"]] = relationship("Cita", back_populates="paciente", lazy="select")

    def to_dict(self) -> dict:
        return {
            "id_paciente":      self.id_paciente,
            "nombre":           self.nombre,
            "ape_paterno":      self.ape_paterno,
            "ape_materno":      self.ape_materno,
            "fecha_nacimiento": str(self.fecha_nacimiento) if self.fecha_nacimiento else None,
            "sexo":             self.sexo,
            "telefono":         self.telefono,
            "correo":           self.correo,
            "direccion":        self.direccion,
            "fecha_registro":   str(self.fecha_registro) if self.fecha_registro else None,
            "estado":           self.estado,
        }

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.ape_paterno} {self.ape_materno}".strip()
