"""
app/models/cita.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: citas
PK: id_cita
FK: id_paciente → pacientes.id_paciente
FK: id_medico   → medicos.id_medico
FK: id_clinica  → clinicas.id_clinica

DISCREPANCIAS con docs/DATABASE.md:
  - PK es `id_cita`, no `id`.
  - Estado por defecto es 'Agendada' (con mayúscula), no 'programada'.
  - Tiene columna `fecha_registro` (timestamp de creación del registro).
  - `hora` es de tipo TIME (no VARCHAR).
"""

from datetime import datetime, date, time
from sqlalchemy import String, Integer, Date, Time, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .base import ModeloBase

ESTADOS_VALIDOS = ("Agendada", "Atendida", "Cancelada", "Reagendada")


class Cita(ModeloBase):
    __tablename__ = "citas"

    id_cita:        Mapped[int]          = mapped_column(Integer, primary_key=True)
    id_paciente:    Mapped[int]          = mapped_column(
        Integer, ForeignKey("pacientes.id_paciente"), nullable=False
    )
    id_medico:      Mapped[int]          = mapped_column(
        Integer, ForeignKey("medicos.id_medico"), nullable=False
    )
    id_clinica:     Mapped[int]          = mapped_column(
        Integer, ForeignKey("clinicas.id_clinica"), nullable=False
    )
    fecha:          Mapped[date]         = mapped_column(Date, nullable=False)
    hora:           Mapped[time]         = mapped_column(Time, nullable=False)
    motivo:         Mapped[str | None]   = mapped_column(String(255))
    estado:         Mapped[str]          = mapped_column(
        String(20), nullable=False, default="Agendada"
    )
    fecha_registro: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relaciones
    paciente:  Mapped["Paciente"] = relationship("Paciente", back_populates="citas")
    medico:    Mapped["Medico"]   = relationship("Medico",   back_populates="citas")
    clinica:   Mapped["Clinica"]  = relationship("Clinica",  back_populates="citas")
    consultas: Mapped[list["Consulta"]] = relationship(
        "Consulta", back_populates="cita", lazy="select"
    )

    def to_dict(self) -> dict:
        return {
            "id_cita":        self.id_cita,
            "id_paciente":    self.id_paciente,
            "id_medico":      self.id_medico,
            "id_clinica":     self.id_clinica,
            "fecha":          str(self.fecha) if self.fecha else None,
            "hora":           str(self.hora)  if self.hora  else None,
            "motivo":         self.motivo,
            "estado":         self.estado,
            "fecha_registro": str(self.fecha_registro) if self.fecha_registro else None,
        }
