# ClinicTec — Base de Datos

## 1. Plataforma

- **Motor:** PostgreSQL
- **Alojamiento:** Supabase
- **Conexión desde Flask:** directamente a PostgreSQL (no se usa la API REST de Supabase).

> ⚠️ La base de datos y sus tablas ya existen. No crearlas ni modificarlas sin análisis previo.

---

## 2. Tablas existentes

Las siguientes tablas fueron definidas en la fase de diseño de la BD. Las columnas exactas deben confirmarse inspeccionando el esquema real antes de escribir los modelos SQLAlchemy.

| Tabla | Descripción esperada |
|---|---|
| `usuarios` | Cuentas de acceso al sistema (todos los roles). |
| `clinicas` | Establecimientos médicos registrados en el sistema. |
| `pacientes` | Expedientes básicos de los pacientes. |
| `medicos` | Perfil de los médicos vinculados a una clínica. |
| `citas` | Registro de citas programadas, atendidas o canceladas. |
| `consultas` | Detalle de cada consulta médica (diagnóstico, tratamiento). |
| `recetas` | Cabecera de recetas médicas asociadas a una consulta. |
| `detalle_receta` | Líneas de medicamento por receta. |

---

## 3. Relaciones reales (verificadas)

```
clinicas ──< medicos        (medicos.id_clinica → clinicas.id_clinica)
clinicas ──< citas          (citas.id_clinica   → clinicas.id_clinica)
usuarios ──1 medicos        (medicos.id_usuario → usuarios.id_usuario, UNIQUE)
medicos  ──< citas          (citas.id_medico    → medicos.id_medico)
pacientes ──< citas         (citas.id_paciente  → pacientes.id_paciente)
citas    ──1 consultas      (consultas.id_cita  → citas.id_cita, UNIQUE → 1:1)
consultas ──< recetas       (recetas.id_consulta → consultas.id_consulta)
recetas  ──< detalle_receta (detalle_receta.id_receta → recetas.id_receta)
```

**Nota:** `pacientes` y `usuarios` no tienen FK directa a `clinicas`.
La clínica del paciente se determina a través de las citas.

---

## 4. Conexión desde Flask

### 4.1 Variable de entorno requerida

```
DATABASE_URL=postgresql+psycopg2://<usuario>:<contraseña>@<host>:<puerto>/<base_de_datos>
```

**Ejemplo de formato (sin credenciales reales):**

```
DATABASE_URL=postgresql+psycopg2://clinictec_user:CONTRASEÑA@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### 4.2 Reglas de seguridad

- El archivo `.env` **nunca debe subirse a Git**.
- Agrega `.env` al `.gitignore` antes del primer commit.
- El archivo `.env.example` en el repositorio documenta los nombres de variables sin sus valores.
- En producción, la variable se configura en el panel del servicio de hosting (Railway, Render, etc.).

### 4.3 Configuración en Flask

```python
# backend/app/config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
```

```python
# backend/app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()
```

```python
# backend/app/__init__.py
from flask import Flask
from .extensions import db, migrate
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    migrate.init_app(app, db)
    return app
```

### 4.4 Dependencias Python requeridas

```
Flask
Flask-SQLAlchemy
Flask-Migrate
psycopg2-binary
python-dotenv
```

> `psycopg2-binary` es el driver que SQLAlchemy usa para comunicarse con PostgreSQL.
> `python-dotenv` carga automáticamente el archivo `.env` al iniciar Flask en desarrollo.

---

## 5. Procedimiento antes de crear modelos SQLAlchemy

Antes de escribir los modelos, se debe inspeccionar el esquema real ejecutando el siguiente SQL en Supabase (Dashboard → SQL Editor) o con un cliente como DBeaver / psql:

```sql
-- Ver todas las tablas del esquema público
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver columnas de una tabla específica
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '<nombre_tabla>'
ORDER BY ordinal_position;

-- Ver restricciones y claves foráneas
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public';
```

Documenta el resultado en esta misma sección (`DATABASE.md`) antes de proceder con la implementación.

---

## 6. Estrategia con Flask-Migrate

- Flask-Migrate se usa para futuras **migraciones controladas**, no para la creación inicial (que ya ocurrió en Supabase).
- Después de confirmar que los modelos SQLAlchemy coinciden con el esquema real, se inicializa el historial de migraciones con:

```bash
flask db init       # una sola vez
flask db migrate    # genera el script de migración
flask db upgrade    # aplica la migración
```

- **No ejecutar estos comandos** hasta haber verificado que los modelos coinciden con las tablas existentes.

---

## 7. Esquema real ✅ Verificado (10-oct-2026)

> Inspeccionado con `python -m app.utils.inspect_schema`.
> Informe completo en `docs/SCHEMA_REAL.md`.

| Tabla | Modelo | PK | Verificada |
|---|---|---|---|
| `usuarios` | `app/models/usuario.py` | `id_usuario` | ✅ |
| `clinicas` | `app/models/clinica.py` | `id_clinica` | ✅ |
| `pacientes` | `app/models/paciente.py` | `id_paciente` | ✅ |
| `medicos` | `app/models/medico.py` | `id_medico` | ✅ |
| `citas` | `app/models/cita.py` | `id_cita` | ✅ |
| `consultas` | `app/models/consulta.py` | `id_consulta` | ✅ |
| `recetas` | `app/models/receta.py` | `id_receta` | ✅ |
| `detalle_receta` | `app/models/detalle_receta.py` | `id_detalle` | ✅ |

## 8. Discrepancias con la documentación inicial

| Tabla | Campo documentado | Realidad en Supabase |
|---|---|---|
| Todas | PKs llamados `id` | PKs tienen prefijo: `id_cita`, `id_medico`, etc. |
| `usuarios` | `correo` como login | Columna `usuario` (nombre de usuario) |
| `usuarios` | `id_clinica` | No existe — usuario se asocia a clínica via médico |
| `pacientes` | `numero_expediente` | No existe — `id_paciente` es el identificador |
| `pacientes` | Solo `nombre` | Separado en `nombre`, `ape_paterno`, `ape_materno` |
| `pacientes` | Sin más campos | Tiene `sexo`, `correo`, `direccion` |
| `medicos` | Solo `nombre` | Separado en `nombre`, `ape_paterno`, `ape_materno` |
| `medicos` | Sin `cedula_profesional` | Tiene `cedula_profesional` UNIQUE |
| `citas` | Estado `programada` | Estado por defecto es `'Agendada'` (con mayúscula) |
| `citas` | Sin `fecha_registro` | Tiene `fecha_registro` (timestamp de creación) |
| `consultas` | Tiene `exploracion` | No existe — tiene `observaciones` en su lugar |
| `consultas` | Relación 1:N con citas | Es 1:1 (índice UNIQUE en `id_cita`) |
| `recetas` | `fecha_emision` | Se llama `fecha_receta` |
| `recetas` | Sin `indicaciones` | Tiene columna `indicaciones` general |
| `detalle_receta` | `instrucciones` | Se llama `indicaciones` |
| `detalle_receta` | Solo `dosis` | Tiene `dosis` + `frecuencia` + `duracion` separados |
