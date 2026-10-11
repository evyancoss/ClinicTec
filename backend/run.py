"""
run.py
Punto de entrada del servidor Flask de ClinicTec.

USO:
    cd backend/
    source .venv/bin/activate
    flask run                    # usa las variables de FLASK_APP y FLASK_ENV
    # o directamente:
    python run.py
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

# Cargar .env antes de importar la app para que Config lea las variables
load_dotenv(Path(__file__).parent / ".env")

from app import create_app

# Configurar logging básico (sin imprimir DATABASE_URL ni secretos)
logging.basicConfig(
    level=logging.DEBUG if os.environ.get("FLASK_ENV") == "development" else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = create_app()

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=app.config.get("DEBUG", False),
    )
