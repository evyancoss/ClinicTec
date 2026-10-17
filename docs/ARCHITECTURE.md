# ClinicTec — Arquitectura del Sistema

## 1. Visión general

```
┌──────────────────────────┐
│ NAVEGADOR                │
│ React + Vite + TypeScript│
└────────────┬─────────────┘
             │ HTTPS, mismo origen
             ▼
┌──────────────────────────┐       rewrite /api/*       ┌─────────────────────┐
│ VERCEL                   │ ──────────────────────────► │ RENDER              │
│ Frontend estático, dist/ │                             │ Flask + Gunicorn    │
└──────────────────────────┘                             └──────────┬──────────┘
                                                                    │ DATABASE_URL
                                                                    ▼
                                                       ┌────────────────────────┐
                                                       │ SUPABASE (PostgreSQL)  │
                                                       │ Esquema existente      │
                                                       └────────────────────────┘
```

La configuración preparada para el piloto está en `frontend/vercel.json`,
`render.yaml` y `.python-version`; sus pasos y variables están en
`docs/PRIVACIDAD_Y_DESPLIEGUE.md`. El rewrite mantiene la URL del navegador
bajo Vercel para que la cookie de refresh HttpOnly/Secure siga siendo
first-party. El host de destino Render es un marcador hasta que Render asigne
el URL del servicio. Esta configuración no representa un despliegue realizado.

---

## 2. Frontend

### 2.1 Estructura de carpetas propuesta

```
frontend/
├── public/                  # Activos estáticos
├── src/
│   ├── assets/              # Imágenes, íconos, fuentes
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/              # Componentes base de shadcn/ui
│   │   ├── layout/          # Header, Sidebar, Footer
│   │   └── shared/          # Badges, modales, tablas genéricas
│   ├── features/            # Módulos por dominio
│   │   ├── auth/            # Login, guards de ruta
│   │   ├── recepcion/       # Agenda, citas, pacientes
│   │   ├── medico/          # Agenda propia, consultas, recetas
│   │   └── admin/           # Dashboard, clínicas, usuarios
│   ├── hooks/               # Custom hooks (useAuth, useApi, etc.)
│   ├── lib/                 # Configuración de axios / fetch
│   ├── router/              # Definición de rutas con React Router
│   ├── store/               # Estado global (Context API o Zustand)
│   ├── types/               # Tipos e interfaces TypeScript
│   └── utils/               # Helpers y formateadores
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 2.2 Manejo de rutas y roles

React Router protegerá las rutas mediante un componente `<PrivateRoute>` que:

1. Verifica si existe un token/sesión activa.
2. Comprueba que el rol del usuario tenga acceso a la ruta solicitada.
3. Redirige a `/login` o a `/no-autorizado` según corresponda.

### 2.3 Comunicación con el backend

- Todas las peticiones se realizan a través de una instancia centralizada de `axios` (o `fetch`) configurada en `src/lib/api.ts`.
- El token de autenticación se adjunta automáticamente en el header `Authorization: Bearer <token>`.
- Los errores se manejan globalmente mediante interceptores.

---

## 3. Backend

### 3.1 Estructura de carpetas propuesta

```
backend/
├── app/
│   ├── __init__.py          # Factory function create_app()
│   ├── config.py            # Configuración por entorno (dev/prod)
│   ├── extensions.py        # Instancias de db, migrate, jwt, etc.
│   ├── models/              # Modelos SQLAlchemy (uno por tabla)
│   │   ├── usuario.py
│   │   ├── clinica.py
│   │   ├── paciente.py
│   │   ├── medico.py
│   │   ├── cita.py
│   │   ├── consulta.py
│   │   ├── receta.py
│   │   └── detalle_receta.py
│   ├── blueprints/          # Blueprints por dominio
│   │   ├── auth/            # Login, logout, refresh
│   │   ├── recepcion/       # Citas, pacientes (rol: recepcion)
│   │   ├── medico/          # Consultas, recetas (rol: medico)
│   │   └── admin/           # Clínicas, usuarios (rol: administrador)
│   ├── schemas/             # Marshmallow o Pydantic para validación
│   └── utils/               # Decoradores de rol, helpers
├── migrations/              # Archivos generados por Flask-Migrate
├── tests/                   # Pruebas unitarias e integración
├── .env.example             # Plantilla de variables de entorno
├── .gitignore
├── requirements.txt
└── run.py                   # Punto de entrada
```

### 3.2 Patrón de respuesta de la API

Todas las respuestas siguen este formato JSON:

```json
{
  "data": { ... },
  "error": null,
  "status": 200
}
```

En caso de error:

```json
{
  "data": null,
  "error": "Mensaje descriptivo del error",
  "status": 400
}
```

### 3.3 Control de acceso

- Cada endpoint usa un decorador `@requiere_rol("recepcion", "administrador")` que extrae el rol del token y rechaza la petición si no coincide.
- El backend es el guardián definitivo; el frontend solo mejora la experiencia del usuario.

### 3.4 Agenda de citas

- `GET /api/citas?fecha=AAAA-MM-DD` devuelve citas paginadas dentro del alcance autorizado: recepción se limita al `RECEPTION_CLINIC_ID` configurado en el servidor, y un médico a su propio perfil y clínica.
- `GET /api/citas/<id>` aplica el mismo alcance; no se acepta un `id_medico` del cliente para ampliar permisos.
- `POST /api/citas/` permite a recepción registrar una cita de 60 minutos. La clínica operativa se obtiene de la configuración del servidor (clínica 1 en esta instalación); se rechazan campos de clínica y estado enviados por el cliente.
- `POST /api/citas/<id>/reprogramar` permite a recepción actualizar fecha y hora de la misma cita `Agendada`, dentro de la clínica configurada. Acepta únicamente `fecha` y `hora`, conserva paciente, médico, clínica, estado y motivo, y no guarda la fecha/hora sustituida en un historial.
- `POST /api/citas/<id>/cancelar` permite a recepción cancelar una cita `Agendada` solo dentro de la clínica configurada en el servidor. No acepta un identificador de clínica del cliente, conserva los demás datos y no registra motivo de cancelación.
- La tabla actual no almacena duración. La API aplica `CITA_DURACION_MINUTOS = 60` a citas nuevas e interpreta también las existentes como 60 minutos para detectar empalmes; no persiste una duración por cita.
- La creación bloquea la fila del médico con `SELECT ... FOR UPDATE` y valida empalmes en la transacción. `Agendada` y `Atendida` bloquean el horario; `Cancelada` y `Reagendada` no. La intersección es semiabierta, por lo que citas consecutivas se permiten; se contemplan cruces de medianoche.
- La reprogramación conserva el ID de cita y cambia su fecha/hora en el mismo registro; la fecha y hora anteriores se sobrescriben y no pueden consultarse después como historial. No requiere cambios de esquema. La operación toma el bloqueo de la fila del médico y la cita, valida empalmes excluyendo la propia cita y confirma la actualización en una transacción.
- SQLite en memoria valida las reglas funcionales, pero no demuestra el bloqueo concurrente real de PostgreSQL. En esta revisión no hay servidor disponible en `localhost:5432` o `localhost:5433`, ni están instalados/disponibles `psql`, `pg_ctl`, `initdb`, Docker o Podman; no se intentó usar Supabase.
- Validación de concurrencia pendiente: disponer de un PostgreSQL local o efímero aislado y ejecutar una prueba de integración con dos conexiones/sesiones independientes. En una base descartable, cargar solo clínica/médico/paciente sintéticos, iniciar simultáneamente dos solicitudes para crear la misma franja del mismo médico y comprobar que una confirme, la otra responda `409` y solo quede una cita bloqueante. También probar dos registros de consulta simultáneos para la misma cita `Agendada`; debe confirmarse uno y el segundo recibir `409`, con una sola consulta y la cita en `Atendida`. La prueba debe levantar un contexto Flask por worker, usar una barrera para iniciar ambas solicitudes a la vez y consultar el resultado desde una tercera sesión. La instalación actual fuerza SQLite en memoria mediante `TestingConfig`, por lo que un test PostgreSQL requerirá configuración de integración explícita y una URL de base exclusivamente descartable; nunca usar Supabase compartido. SQLite no sustituye esta comprobación.
- La BD reportada no impone CHECK para los estados; la API debe validar `Agendada`, `Atendida`, `Cancelada` y `Reagendada`, y la interfaz traducirlos para presentación.

### 3.5 Consultas, historial y recetas

- `POST /api/citas/<id_cita>/consulta` requiere JWT con rol `medicos` y perfil
  médico activo. El perfil se obtiene de la identidad autenticada; solo se
  permite atender una cita `Agendada` asignada a ese médico y a su clínica.
- La ruta acepta solo `motivo`, `diagnostico`, `observaciones` y `tratamiento`.
  Todas estas columnas son `TEXT` nullable en el esquema real; ningún campo
  individual es obligatorio, pero se exige al menos uno no vacío. Se validan
  como texto y tienen límite de entrada de 10 000 caracteres. `exploracion` no
  existe y se rechaza.
- La API bloquea primero la fila del médico y después la cita, siguiendo el
  orden de bloqueo del flujo de agenda. La creación de la consulta y el cambio
  de la cita a `Atendida` ocurren en una transacción; cualquier error, incluido
  el commit, provoca rollback. SQLite verifica el resultado funcional, pero no
  valida la semántica concurrente de PostgreSQL.
- `GET /api/pacientes/<id>/historial` es el endpoint existente ampliado. Solo
  responde al médico con citas de ese paciente asignadas a su perfil y clínica.
  Paciente inexistente y paciente fuera de alcance devuelven el mismo `404`.
  Administrador y recepción reciben `403` sin datos clínicos. Se exponen solo
  datos básicos del paciente, citas autorizadas, consultas, recetas y detalles;
  nunca hashes ni tokens.
- `POST /api/consultas/<id_consulta>/recetas` permite al médico asignado emitir
  receta. No recibe identidades de cita, médico o consulta en el cuerpo. Exige
  uno o más detalles porque `medicamento` es obligatorio; receta y detalles se
  confirman juntos o se revierten juntos.
- El esquema no impone unicidad de recetas por consulta, por lo que se pueden
  emitir varias. Los endpoints actuales no permiten editar ni eliminar
  recetas. No se incorporan campos, tablas ni restricciones al esquema.
- La agenda médica inicia consultas solo desde citas `Agendada`. El historial
  permite revisar el contenido guardado y emitir recetas; el modo demo no llama
  a estos endpoints y no simula persistencia.
- La escritura concurrente y los bloqueos de estas operaciones todavía no se
  han ejecutado contra PostgreSQL. En la revisión no se encontraron cliente,
  herramientas de inicialización/contenedor ni servicio local en los puertos
  habituales; no se instaló ni levantó infraestructura.

---

## 4. Base de datos (Supabase / PostgreSQL)

- La base de datos ya existe y contiene 8 tablas.
- Flask se conecta **directamente** a PostgreSQL mediante `psycopg2` (no se usa el cliente JS de Supabase ni la API REST de Supabase).
- La cadena de conexión se lee exclusivamente desde la variable de entorno `DATABASE_URL`.
- No se crearán tablas nuevas ni se modificarán las existentes sin un análisis previo y aprobación.

---

## 5. Flujo de autenticación (a definir en Fase 3)

```
Cliente                  Flask                    PostgreSQL
  |                        |                           |
  |-- POST /auth/login --→ |                           |
  |                        |-- SELECT usuario ... --→  |
  |                        |←-- resultado ------------ |
  |                        |-- genera JWT ------------ |
  |←-- { token, rol } ---- |                           |
  |                        |                           |
  |-- GET /recepcion/citas (Authorization: Bearer <token>) --→
  |                        |-- valida JWT / rol ------- |
  |←-- { data: [...] } --- |                           |
```

**Decisión pendiente:** JWT sin estado (stateless) vs. sesiones Flask con tabla de tokens en BD.

---

## 6. Consideraciones de seguridad

- `DATABASE_URL` y cualquier secreto solo vivirán en `.env` (nunca en el repositorio).
- `.env` está en `.gitignore`.
- `.env.example` documenta las variables necesarias **sin valores reales**.
- Las contraseñas de usuarios se almacenarán con hash (bcrypt o Argon2id).
- CORS configurado para aceptar peticiones solo desde el origen del frontend.
- Cabeceras de seguridad (CSP, X-Frame-Options) a añadir en producción.

---

## 7. Despliegue (referencia futura)

| Componente | Candidato |
|---|---|
| Frontend | Vercel / Netlify / S3 + CloudFront |
| Backend | Railway / Render / Fly.io |
| Base de datos | Supabase (ya en producción) |

> Esta sección es orientativa. La decisión de despliegue se tomará en una fase posterior.
