"""
app/utils/inspect_schema.py
─────────────────────────────────────────────────────────────────────────────
Script de inspección del esquema real de Supabase PostgreSQL.

USO (desde la carpeta backend/):
    source .venv/bin/activate
    python -m app.utils.inspect_schema

Requisito: DATABASE_URL configurada en backend/.env

El script imprime las tablas, columnas, tipos y claves foráneas reales
de las 8 tablas de ClinicTec, y genera un informe en docs/SCHEMA_REAL.md.

NO modifica ningún dato ni esquema.
"""

import os
import sys
from pathlib import Path

# Cargar .env antes de importar la app
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError

TABLAS_ESPERADAS = [
    "usuarios",
    "clinicas",
    "pacientes",
    "medicos",
    "citas",
    "consultas",
    "recetas",
    "detalle_receta",
]

DOCS_PATH = Path(__file__).resolve().parents[3] / "docs" / "SCHEMA_REAL.md"


def main():
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("ERROR: DATABASE_URL no está configurada en backend/.env")
        print("  Copia backend/.env.example a backend/.env y agrega tus credenciales.")
        sys.exit(1)

    # Nunca imprimir la URL completa con credenciales
    print("Conectando a la base de datos…")

    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Conexión exitosa.\n")
    except OperationalError as exc:
        print(f"ERROR de conexión: {type(exc).__name__}")
        print("  Verifica host, puerto, usuario y contraseña en DATABASE_URL.")
        sys.exit(1)

    inspector = inspect(engine)

    # ── Tablas encontradas ────────────────────────────────────────────────────
    tablas_en_bd = set(inspector.get_table_names(schema="public"))
    print(f"Tablas en el esquema 'public' ({len(tablas_en_bd)}):")
    for t in sorted(tablas_en_bd):
        print(f"  {'✅' if t in TABLAS_ESPERADAS else '⚠️ '} {t}")

    tablas_faltantes = set(TABLAS_ESPERADAS) - tablas_en_bd
    tablas_extra = tablas_en_bd - set(TABLAS_ESPERADAS)
    if tablas_faltantes:
        print(f"\n⚠️  Tablas esperadas NO encontradas: {sorted(tablas_faltantes)}")
    if tablas_extra:
        print(f"\nℹ️  Tablas adicionales encontradas: {sorted(tablas_extra)}")

    # ── Detalle por tabla ─────────────────────────────────────────────────────
    resultado = {}
    tablas_a_inspeccionar = set(TABLAS_ESPERADAS) & tablas_en_bd

    for tabla in sorted(tablas_a_inspeccionar):
        print(f"\n{'─'*60}")
        print(f"TABLA: {tabla}")
        cols = inspector.get_columns(tabla, schema="public")
        pk = inspector.get_pk_constraint(tabla, schema="public")
        fks = inspector.get_foreign_keys(tabla, schema="public")
        idxs = inspector.get_indexes(tabla, schema="public")

        print(f"  PK: {pk.get('constrained_columns', [])}")
        print(f"  Columnas ({len(cols)}):")
        col_info = []
        for c in cols:
            nullable = "" if c.get("nullable", True) else " NOT NULL"
            default = f" DEFAULT {c['default']}" if c.get("default") else ""
            print(f"    {c['name']:30s} {str(c['type']):25s}{nullable}{default}")
            col_info.append({
                "nombre": c["name"],
                "tipo": str(c["type"]),
                "nullable": c.get("nullable", True),
                "default": c.get("default"),
            })

        if fks:
            print(f"  Claves foráneas ({len(fks)}):")
            for fk in fks:
                print(f"    {fk['constrained_columns']} → {fk['referred_table']}.{fk['referred_columns']}")

        if idxs:
            print(f"  Índices ({len(idxs)}):")
            for idx in idxs:
                unique = " UNIQUE" if idx.get("unique") else ""
                print(f"    {idx['name']:40s} {idx['column_names']}{unique}")

        resultado[tabla] = {
            "columnas": col_info,
            "pk": pk.get("constrained_columns", []),
            "fks": fks,
            "indices": idxs,
        }

    # ── Generar SCHEMA_REAL.md ────────────────────────────────────────────────
    _generar_markdown(resultado, tablas_faltantes, tablas_extra)
    print(f"\n✅ Informe guardado en: {DOCS_PATH}")


def _generar_markdown(resultado: dict, faltantes: set, extras: set) -> None:
    from datetime import datetime
    lineas = [
        "# ClinicTec — Esquema Real de la Base de Datos",
        "",
        f"> Generado automáticamente el {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "> por `app/utils/inspect_schema.py`. No editar manualmente.",
        "",
    ]

    if faltantes:
        lineas += [
            "## ⚠️ Tablas esperadas no encontradas",
            "",
            *[f"- `{t}`" for t in sorted(faltantes)],
            "",
        ]

    if extras:
        lineas += [
            "## ℹ️ Tablas adicionales en la BD",
            "",
            *[f"- `{t}`" for t in sorted(extras)],
            "",
        ]

    for tabla, info in sorted(resultado.items()):
        lineas += [
            f"## `{tabla}`",
            "",
            f"**PK:** `{', '.join(info['pk']) or '—'}`",
            "",
            "| Columna | Tipo | Nullable | Default |",
            "|---------|------|----------|---------|",
        ]
        for col in info["columnas"]:
            lineas.append(
                f"| `{col['nombre']}` | `{col['tipo']}` "
                f"| {'Sí' if col['nullable'] else 'No'} "
                f"| `{col['default'] or '—'}` |"
            )
        lineas.append("")

        if info["fks"]:
            lineas += ["**Claves foráneas:**", ""]
            for fk in info["fks"]:
                lineas.append(
                    f"- `{', '.join(fk['constrained_columns'])}` → "
                    f"`{fk['referred_table']}.{', '.join(fk['referred_columns'])}`"
                )
            lineas.append("")

    DOCS_PATH.write_text("\n".join(lineas), encoding="utf-8")


if __name__ == "__main__":
    main()
