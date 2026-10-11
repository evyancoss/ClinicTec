"""
app/models/usuario.py
Modelo verificado contra el esquema real de Supabase (10-oct-2026).

Tabla: usuarios
PK: id_usuario
Índice UNIQUE: usuario (nombre de login)

NOTA: la columna se llama `usuario` (nombre de login), no `correo`.
No existe columna id_clinica en esta tabla — los usuarios no están
ligados directamente a una clínica; lo están a través del médico.
"""

from datetime import datetime
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .base import ModeloBase


class Usuario(ModeloBase):
    __tablename__ = "usuarios"

    id_usuario:     Mapped[int]      = mapped_column(Integer, primary_key=True)
    nombre:         Mapped[str]      = mapped_column(String(100), nullable=False)
    ape_paterno:    Mapped[str]      = mapped_column(String(100), nullable=False)
    ape_materno:    Mapped[str]      = mapped_column(String(100), nullable=False)
    rol:            Mapped[str]      = mapped_column(String(20),  nullable=False)
    usuario:        Mapped[str]      = mapped_column(String(100), nullable=False, unique=True)
    contrasena:     Mapped[str]      = mapped_column(String(255), nullable=False)
    fecha_registro: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relación inversa con médico (1:1)
    medico: Mapped["Medico | None"] = relationship(
        "Medico", back_populates="usuario_cuenta", uselist=False, lazy="select"
    )

    def to_dict(self) -> dict:
        """Nunca expone la contraseña."""
        return {
            "id_usuario":     self.id_usuario,
            "nombre":         self.nombre,
            "ape_paterno":    self.ape_paterno,
            "ape_materno":    self.ape_materno,
            "rol":            self.rol,
            "usuario":        self.usuario,
            "fecha_registro": str(self.fecha_registro) if self.fecha_registro else None,
        }

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombre} {self.ape_paterno} {self.ape_materno}".strip()
