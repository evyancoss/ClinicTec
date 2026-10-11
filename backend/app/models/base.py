"""
app/models/base.py
Clase base para todos los modelos SQLAlchemy de ClinicTec.
Proporciona utilidades comunes (repr, to_dict básico).
"""

from ..extensions import db


class ModeloBase(db.Model):
    """
    Clase abstracta base. No genera tabla propia.
    Todos los modelos de ClinicTec la heredan.
    """
    __abstract__ = True

    def to_dict(self) -> dict:
        """
        Serializa el modelo a diccionario.
        Excluye columnas que empiecen con '_'.
        Para campos sensibles (contraseñas, tokens), subclasear y sobrescribir.
        """
        return {
            col.name: getattr(self, col.name)
            for col in self.__table__.columns
            if not col.name.startswith("_")
        }

    def __repr__(self) -> str:
        pk_cols = [c.name for c in self.__table__.primary_key.columns]
        pk_vals = {c: getattr(self, c, "?") for c in pk_cols}
        return f"<{self.__class__.__name__} {pk_vals}>"
