"""
app/utils/validators.py
Validadores de entrada reutilizables para los blueprints de ClinicTec.
Devuelven None si el valor es válido, o un mensaje de error si no lo es.
"""

import re
from datetime import date


# ── Texto general ─────────────────────────────────────────────────────────────

def validar_texto(valor: str | None, campo: str, max_len: int = 255,
                  requerido: bool = True) -> str | None:
    if valor is None or valor == "":
        return f"{campo} es requerido." if requerido else None
    if not isinstance(valor, str):
        return f"{campo} debe ser texto."
    if not valor.strip():
        return f"{campo} es requerido." if requerido else None
    if len(valor.strip()) > max_len:
        return f"{campo} no puede superar {max_len} caracteres."
    return None


def validar_nombre(valor: str | None, campo: str = "Nombre") -> str | None:
    if valor is None or valor == "":
        return validar_texto(valor, campo, max_len=100)
    if not isinstance(valor, str):
        return f"{campo} debe ser texto."
    err = validar_texto(valor, campo, max_len=100)
    if err:
        return err
    if not re.match(r"^[A-Za-záéíóúüñÁÉÍÓÚÜÑ\s'\-]+$", valor.strip()):
        return f"{campo} contiene caracteres no permitidos."
    return None


# ── Fecha ──────────────────────────────────────────────────────────────────────

def validar_fecha_nacimiento(valor: str | None) -> str | None:
    if not isinstance(valor, str) or not valor:
        return "Fecha de nacimiento es requerida."
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", valor):
        return "Fecha de nacimiento inválida. Use el formato AAAA-MM-DD."
    try:
        fecha = date.fromisoformat(valor)
    except ValueError:
        return "Fecha de nacimiento inválida. Use el formato AAAA-MM-DD."
    hoy = date.today()
    if fecha >= hoy:
        return "La fecha de nacimiento debe ser anterior a hoy."
    if (hoy - fecha).days > 365 * 130:
        return "Fecha de nacimiento no válida."
    return None


# ── Sexo ───────────────────────────────────────────────────────────────────────

SEXOS_VALIDOS = {"Masculino", "Femenino", "Otro"}

def validar_sexo(valor: str | None) -> str | None:
    if valor is None or valor == "":
        return "Sexo es requerido."
    if not isinstance(valor, str):
        return "Sexo debe ser texto."
    if valor not in SEXOS_VALIDOS:
        return f"Sexo inválido. Valores permitidos: {', '.join(sorted(SEXOS_VALIDOS))}."
    return None


# ── Teléfono ──────────────────────────────────────────────────────────────────

def validar_telefono(valor: str | None) -> str | None:
    if valor is None or valor == "":
        return None   # opcional
    if not isinstance(valor, str):
        return "Teléfono debe ser texto."
    if len(valor.strip()) > 20:
        return "Teléfono no puede superar 20 caracteres."
    limpio = re.sub(r"[\s\-\.\(\)\+]", "", valor)
    if not limpio.isdigit():
        return "Teléfono contiene caracteres no válidos."
    if not (7 <= len(limpio) <= 15):
        return "Teléfono debe tener entre 7 y 15 dígitos."
    return None


# ── Correo ────────────────────────────────────────────────────────────────────

def validar_correo(valor: str | None) -> str | None:
    if valor is None or valor == "":
        return None   # opcional
    if not isinstance(valor, str):
        return "Correo electrónico debe ser texto."
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", valor.strip()):
        return "Correo electrónico inválido."
    if len(valor.strip()) > 100:
        return "Correo no puede superar 100 caracteres."
    return None


# ── Paginación ────────────────────────────────────────────────────────────────

def parse_paginacion(args: dict) -> tuple[int, int]:
    """Devuelve (pagina, por_pagina) con valores seguros."""
    try:
        pagina = max(1, int(args.get("pagina", 1)))
    except (ValueError, TypeError):
        pagina = 1
    try:
        por_pagina = min(100, max(1, int(args.get("por_pagina", 20))))
    except (ValueError, TypeError):
        por_pagina = 20
    return pagina, por_pagina
