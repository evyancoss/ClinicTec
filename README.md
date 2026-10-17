# ClinicTec

Aplicación web de gestión de clínicas médicas.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router |
| Backend | Python, Flask, Flask Blueprints, SQLAlchemy, Flask-Migrate |
| Base de datos | PostgreSQL alojado en Supabase |

## Estructura del proyecto

```
ClinicTec/
├── frontend/          # Aplicación React + Vite
├── backend/           # API Flask
└── docs/              # Documentación del proyecto
    ├── PRODUCT_SPEC.md
    ├── ARCHITECTURE.md
    ├── DESIGN_SYSTEM.md
    └── DATABASE.md
```

## Roles de usuario

- **Administrador** — Dashboard, gestión de clínicas y cuentas de usuario.
- **Recepción** — Agenda diaria, registro de pacientes y citas.
- **Médico** — Agenda propia, historial de pacientes, consultas y recetas.

## Documentación

Consulta la carpeta `docs/` para encontrar:

- [`PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — Pantallas, roles, permisos y reglas de negocio.
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitectura React → Flask → Supabase PostgreSQL.
- [`DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — Paleta de colores, tipografía y componentes.
- [`DATABASE.md`](docs/DATABASE.md) — Esquema de tablas y guía de conexión.

## Variables de entorno

El backend requiere un archivo `.env` **local, no versionado** con la siguiente variable:

```
DATABASE_URL=postgresql+psycopg2://<usuario>:<contraseña>@<host>:<puerto>/<base_de_datos>
```

> **Nunca incluyas credenciales reales en archivos versionados.**
> Agrega `.env` a tu `.gitignore` antes del primer commit.

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Documentación e inspección | ✅ Completada |
| 2 | Conexión a BD y modelos SQLAlchemy | ✅ Completada |
| 3 | Autenticación y control de roles | ✅ Completada |
| 4 | Módulo Recepción | ✅ Completada |
| 5 | Módulos funcionales de pacientes y médicos | ✅ Completada |
| 6 | Administración y gestión de citas | 🚧 En desarrollo |
| 7 | Consultas, recetas e historial clínico | ⏳ Pendiente |
