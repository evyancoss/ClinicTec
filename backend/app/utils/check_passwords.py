"""
app/utils/check_passwords.py
Detecta el formato de almacenamiento de contraseñas sin revelar valores.

USO:
    cd backend && source .venv/bin/activate
    python -m app.utils.check_passwords
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

import psycopg2
from urllib.parse import urlparse, unquote


def main():
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        print("ERROR: DATABASE_URL no configurada")
        sys.exit(1)

    url = raw.replace("postgresql+psycopg2://", "postgresql://")
    p = urlparse(url)

    conn = psycopg2.connect(
        host=p.hostname, port=p.port or 5432,
        dbname=p.path.lstrip("/"), user=p.username,
        password=unquote(p.password or ""),
        sslmode="require", connect_timeout=15,
    )
    cur = conn.cursor()

    # Estadísticas de longitud sin mostrar valores
    cur.execute("""
        SELECT
            COUNT(*)                                    AS total,
            MIN(LENGTH(contrasena))                     AS min_len,
            MAX(LENGTH(contrasena))                     AS max_len,
            COUNT(CASE WHEN LENGTH(contrasena) > 50 THEN 1 END) AS larga,
            COUNT(CASE WHEN LENGTH(contrasena) <= 50 THEN 1 END) AS corta
        FROM usuarios
    """)
    total, min_len, max_len, larga, corta = cur.fetchone()
    print(f"Total usuarios  : {total}")
    print(f"Longitud min/max: {min_len} / {max_len}")
    print(f"Longitud > 50   : {larga}  <- posible hash")
    print(f"Longitud <= 50  : {corta}  <- posible texto plano")

    # Prefijos de 7 chars para detectar algoritmo (sin revelar contraseña)
    cur.execute("""
        SELECT LEFT(contrasena, 7) AS prefijo, COUNT(*) AS cantidad
        FROM usuarios
        GROUP BY 1
        ORDER BY 2 DESC
    """)
    print("\nPrefijos detectados (primeros 7 chars):")
    for prefijo, cnt in cur.fetchall():
        hint = ""
        if prefijo.startswith("$argon2"):
            hint = " <- Argon2"
        elif prefijo.startswith("$2b$") or prefijo.startswith("$2a$"):
            hint = " <- bcrypt"
        elif prefijo.startswith("sha256") or prefijo.startswith("sha512"):
            hint = " <- SHA (inseguro para contraseñas)"
        elif prefijo.startswith("pbkdf2"):
            hint = " <- PBKDF2"
        elif len(prefijo) == 7 and prefijo.isalnum():
            hint = " <- posible texto plano o hash sin prefijo conocido"
        print(f"  {prefijo!r:15s} x{cnt}{hint}")

    conn.close()


if __name__ == "__main__":
    main()
