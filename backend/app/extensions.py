"""
app/extensions.py
Instancias de extensiones Flask compartidas por toda la aplicación.
Se inicializan aquí sin app context; se vinculan a la app en create_app().
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
