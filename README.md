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
- [`PRIVACIDAD_Y_DESPLIEGUE.md`](docs/PRIVACIDAD_Y_DESPLIEGUE.md) — Preparación del piloto escolar, configuración de despliegue y privacidad.

## Variables de entorno y despliegue

Para desarrollo local, configura `backend/.env` a partir de
[`backend/.env.example`](backend/.env.example) y `frontend/.env` a partir de
[`frontend/.env.example`](frontend/.env.example). En el despliegue escolar,
`DATABASE_URL` y los secretos se configuran solamente en Render; Vercel no
necesita variables `VITE_*` para la API porque las rutas `/api/*` se reescriben
al backend. Consulta [`docs/PRIVACIDAD_Y_DESPLIEGUE.md`](docs/PRIVACIDAD_Y_DESPLIEGUE.md)
para los pasos, configuración y verificaciones previas a compartir el enlace.

> Nunca incluyas credenciales reales en archivos versionados ni variables
> `VITE_*`. El despliegue no se ha publicado ni conectado desde este repositorio.

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Documentación e inspección | ✅ Completada |
| 2 | Conexión a BD y modelos SQLAlchemy | ✅ Completada |
| 3 | Autenticación y control de roles | ✅ Completada |
| 4 | Módulo Recepción | ✅ Completada |
| 5 | Módulos funcionales de pacientes y médicos | ✅ Completada |
| 6 | Administración y gestión de citas | ✅ Implementada; concurrencia PostgreSQL pendiente |
| 7 | Consultas, recetas e historial clínico | ✅ Implementada; concurrencia PostgreSQL pendiente |

Las suites locales actuales pasan: 218 pruebas backend y 61 frontend; lint,
TypeScript y build también pasan. El cierre técnico de las fases 6 y 7 requiere
probar bloqueos y transacciones concurrentes contra PostgreSQL aislado. No se
usa Supabase compartido para pruebas de escritura. La siguiente fase aún no está
definida en la hoja de ruta.
