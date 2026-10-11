"""
app/models/medico.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: medicos
PK: id_medico
FK: id_clinica → clinicas.id_clinica
FK: id_usuario → usuarios.id_usuario  (nullable, UNIQUE)
Índices UNIQUE: cedula_profesional, id_usuario
"""

from sqlalchemy import String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import ModeloBase


class Medico(ModeloBase):
    __tablename__ = "medicos"

    id_medico:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    id_usuario:         Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuarios.id_usuario"), unique=True
    )
    id_clinica:         Mapped[int]      = mapped_column(
        Integer, ForeignKey("clinicas.id_clinica"), nullable=False
    )
    nombre:             Mapped[str]      = mapped_column(String(100), nullable=False)
    ape_paterno:        Mapped[str]      = mapped_column(String(100), nullable=False)
    ape_materno:        Mapped[str]      = mapped_column(String(100), nullable=False)
    especialidad:       Mapped[str]      = mapped_column(String(100), nullable=False)
    cedula_profesional: Mapped[str]      = mapped_column(String(50),  nullable=False, unique=True)
    telefono:           Mapped[str | None] = mapped_column(String(20))
    correo:             Mapped[str | None] = mapped_column(String(100))
    estado:             Mapped[bool | None] = mapped_column(Boolean, default=True)

    # Relaciones
    clinica:        Mapped["Clinica"]       = relationship("Clinica", back_populates="medicos")
    usuario_cuenta: Mapped["Usuario | None"] = relationship(
        "Usuario", back_populates="medico"
    )
    citas: Mapped[list["Cita"]] = relationship("Cita", back_populates="medico", lazy="select")

    def to_dict(self) -> dict:
        return {
            "id_medico":          self.id_medico,
            "id_usuario":         self.id_usuario,
            "id_clinica":         self.id_clinica,
            "nombre":             self.nombre,
            "ape_paterno":        self.ape_paterno,
            "ape_materno":        self.ape_materno,
            "especialidad":       self.especialidad,
            "cedula_profesional": self.cedula_profesional,
            "telefono":           self.telefono,
            "correo":             self.correo,
            "estado":             self.estado,
        }

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.ape_paterno} {self.ape_materno}".strip()
