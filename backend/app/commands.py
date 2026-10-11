"""
app/commands.py
Comandos CLI de administración de ClinicTec.

USO:
    cd backend && source .venv/bin/activate
    flask crear-admin

SEGURIDAD:
  - Solicita la contraseña de forma interactiva (getpass), nunca por argumento.
  - No crea el usuario si ya existe un administrador.
  - Hashea con Argon2id antes de guardar.
  - No imprime contraseñas ni hashes.
  - No permite rol 'administrador' desde el registro público.
"""

import sys
import getpass
import click
from flask import current_app
from flask.cli import with_appcontext

from .extensions import db
from .models.usuario import Usuario
from .utils.security import hash_password


def register_commands(app):
    """Registra todos los comandos CLI en la aplicación."""
    app.cli.add_command(crear_admin)
    app.cli.add_command(verificar_bd)


@click.command("crear-admin")
@with_appcontext
def crear_admin():
    """
    Crea la primera cuenta de administrador de ClinicTec.
    Solo funciona si NO existe ningún administrador en la BD.
    Solicita credenciales de forma interactiva y segura.
    """
    # Verificar si ya existe algún administrador
    admin_existente = db.session.execute(
        db.select(Usuario).where(Usuario.rol == "administrador")
    ).scalar_one_or_none()

    if admin_existente:
        click.echo("⚠️  Ya existe al menos un administrador. Comando cancelado.")
        click.echo("   Para crear usuarios adicionales, usa la interfaz de administración.")
        sys.exit(0)

    click.echo("─── Crear primer administrador de ClinicTec ───")
    click.echo("    Los campos marcados con * son obligatorios.\n")

    nombre      = click.prompt("  Nombre *").strip()
    ape_paterno = click.prompt("  Apellido paterno *").strip()
    ape_materno = click.prompt("  Apellido materno *").strip()
    usuario_val = click.prompt("  Nombre de usuario (login) *").strip()

    if not all([nombre, ape_paterno, ape_materno, usuario_val]):
        click.echo("❌ Todos los campos son obligatorios. Cancelado.")
        sys.exit(1)

    # Verificar que el nombre de usuario no exista
    existe = db.session.execute(
        db.select(Usuario).where(Usuario.usuario == usuario_val)
    ).scalar_one_or_none()
    if existe:
        click.echo(f"❌ El usuario '{usuario_val}' ya existe. Usa otro nombre.")
        sys.exit(1)

    # Solicitar contraseña de forma segura (no se muestra en pantalla)
    while True:
        contrasena = getpass.getpass("  Contraseña (mín. 12 caracteres): ")
        if len(contrasena) < 12:
            click.echo("  ⚠️  La contraseña debe tener al menos 12 caracteres.")
            continue
        confirmacion = getpass.getpass("  Confirmar contraseña: ")
        if contrasena != confirmacion:
            click.echo("  ⚠️  Las contraseñas no coinciden. Intenta de nuevo.")
            continue
        break

    hash_val = hash_password(contrasena)
    # Eliminar referencia inmediatamente
    del contrasena, confirmacion

    nuevo_admin = Usuario(
        nombre=nombre,
        ape_paterno=ape_paterno,
        ape_materno=ape_materno,
        rol="administrador",
        usuario=usuario_val,
        contrasena=hash_val,
    )

    try:
        db.session.add(nuevo_admin)
        db.session.commit()
        click.echo(f"\n✅ Administrador '{usuario_val}' creado correctamente.")
        click.echo("   Ya puedes iniciar sesión en /api/auth/login")
    except Exception as exc:
        db.session.rollback()
        click.echo(f"❌ Error al guardar en la BD: {type(exc).__name__}")
        sys.exit(1)


@click.command("verificar-bd")
@with_appcontext
def verificar_bd():
    """Verifica la conexión a la base de datos."""
    from sqlalchemy import text
    try:
        db.session.execute(text("SELECT 1"))
        click.echo("✅ Conexión a la base de datos OK")
    except Exception as exc:
        click.echo(f"❌ Error de conexión: {type(exc).__name__}")
        sys.exit(1)
