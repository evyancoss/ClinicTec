"""Punto de entrada WSGI para plataformas de despliegue."""

from app import create_app

app = create_app()
