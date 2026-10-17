# Piloto escolar: despliegue y privacidad

## Alcance y privacidad

ClinicTec se prepara para un **piloto escolar**, no es una plataforma clínica
profesional ni sustituye sistemas, procesos o asesoría médica. No se ha
desplegado ni publicado desde este repositorio.

Para invitar a compañeros o docentes, carga únicamente cuentas y expedientes
sintéticos, claramente identificados como datos de prueba. Los datos pueden
persistirse en la base para probar el flujo, pero nunca deben identificar a
pacientes reales ni incluir sus nombres, teléfonos, correos, domicilios,
diagnósticos, recetas, imágenes o expedientes. No reutilices capturas con datos
identificables.

El dashboard está diseñado para devolver métricas agregadas, no expedientes ni
filas identificables de pacientes. Comprueba esta limitación antes de compartir
el enlace. Las credenciales de Supabase, `DATABASE_URL`, claves JWT y cualquier
otro secreto deben permanecer en el servidor. No los pongas en Git, en Vercel,
en `VITE_*`, en capturas ni en logs.

Antes de tratar información personal o clínica, el responsable debe revisar el
aviso de privacidad, el propósito, la base legal, los permisos, la retención,
la eliminación, los canales de solicitud y la respuesta a incidentes con la
institución y asesoría pertinente. La existencia de controles técnicos no
significa que el sistema cumpla automáticamente una norma o regulación.
Consulta la [LFPDPPP vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)
y, según el uso que se dé al sistema, la
[NOM-004-SSA3-2012 publicada en el DOF](https://www.dof.gob.mx/copias.php?acc=ajaxPaginas&ed=MATUTINO&edicion=248792&fecha=15%2F10%2F2012&paginas=30&seccion=CUARTA).

## Arquitectura preparada

- **Frontend:** React + TypeScript + Vite, servido como archivos estáticos por
  Vercel desde `frontend/`; build `npm run build`, salida `dist/`.
- **API:** Flask + SQLAlchemy en Render, con Gunicorn y WSGI
  `wsgi:app`, desde `backend/`.
- **Base de datos:** PostgreSQL existente en Supabase. El backend abre la
  conexión; el navegador nunca recibe `DATABASE_URL`.
- **Proxy:** `frontend/vercel.json` reescribe `/api/*` hacia el servicio Render
  y envía las rutas de la SPA a `index.html`. Antes del primer despliegue, hay
  que reemplazar `REPLACE_WITH_RENDER_HOST` por el host HTTPS real asignado por
  Render, sin esquema, ruta ni barra final. El marcador no es una URL válida de
  servicio y la API no funcionará hasta sustituirlo.
- **Runtime:** `.python-version` y `render.yaml` fijan Python `3.12.11`.
  `backend/requirements.txt` declara Gunicorn `26.2.0`, que requiere Python
  3.12 o posterior.

La petición del navegador permanece bajo el dominio Vercel. El cliente ya usa
`credentials: "include"`; la cookie de refresh existente sigue siendo
`HttpOnly`, `Secure` en producción, `SameSite=Strict` y limitada a
`/api/auth`. Al ser un rewrite de servidor, el navegador trata login, refresh y
logout como solicitudes de su mismo origen, y recibe los encabezados de cookie
del backend. No se debilitan CORS ni las opciones de cookie.

El rewrite estático también funciona en los despliegues Preview de Vercel.
Desactiva los Preview Deployments antes de crear la conexión con la base real,
o establece una protección equivalente que impida que una URL Preview alcance
la API de producción. La lista CORS no es una protección frente a llamadas
same-origin servidas mediante el proxy.

La base de Supabase existente no se inspeccionó para este despliegue. Antes de
conectarla, el responsable debe confirmar que el proyecto y los registros a
los que tendrán acceso las cuentas del piloto son exclusivamente sintéticos y
autorizados. Si contiene expedientes reales o no se puede confirmar su
contenido, no conectes este piloto a esa base; primero hace falta una instancia
aislada con datos sintéticos.

## Configuración de Render

El archivo raíz `render.yaml` deja declarada la configuración del servicio web.
Al crear el servicio desde el Blueprint, comprueba estos valores:

| Ajuste | Valor |
|---|---|
| Root Directory | `backend` |
| Runtime / versión | Python `3.12.11` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn --bind 0.0.0.0:$PORT --workers 2 wsgi:app` |
| Health Check Path | `/api/health` |

Render proporciona `$PORT`; Gunicorn escucha en `0.0.0.0` en ese puerto. La ruta
`/api/health` confirma que Flask está activo sin consultar la base de datos ni
exponer configuración. No uses `/api/health/db` como health check del proveedor.

El Blueprint configura estas variables en Render:

| Variable | Configuración |
|---|---|
| `FLASK_ENV` | `production` |
| `SECRET_KEY` | Render genera un valor aleatorio |
| `JWT_SECRET_KEY` | Render genera otro valor aleatorio |
| `DATABASE_URL` | Se proporciona manualmente como secreto |
| `CORS_ORIGINS` | Un único origen HTTPS de producción Vercel, sin barra final |
| `RECEPTION_CLINIC_ID` | `1`, según la instalación actual |
| `APP_TIMEZONE` | `America/Mexico_City` |
| `PYTHON_VERSION` | `3.12.11` |
| `JWT_ACCESS_MINUTES` | Opcional; predeterminado `60` |
| `JWT_REFRESH_DAYS` | Opcional; predeterminado `7` |

La configuración de producción falla al arrancar si faltan las claves, la URL
PostgreSQL, la clínica operativa o el origen permitido. El backend valida que
las claves sean distintas y de al menos 32 caracteres, y que CORS contenga
exactamente un origen HTTPS, sin comodines ni rutas.

### URL de Supabase

Obtén la URI desde el proyecto correspondiente en Supabase, en **Connect** o
**Settings → Database → Connection string → URI**. Usa la URI de conexión
PostgreSQL, no la URL del proyecto ni las claves `anon` o `service_role`. El
formato consumido por la aplicación es una URL PostgreSQL con el driver
`psycopg2`; la configuración activa SSL requerido. Si las credenciales incluyen
caracteres reservados de URI, usa la URI codificada que provee Supabase. Elige
en su panel una conexión compatible con `psycopg2` y alcanzable desde Render.
Si la conexión directa no es accesible desde la red o plan seleccionado,
revisa la opción oficial de pooler y confirma su compatibilidad con la
configuración actual antes de usarla.

Introduce la URI solo en el campo secreto `DATABASE_URL` del servicio Render.
No la copies a Vercel, a archivos, tickets o logs; no incluyas la contraseña en
la URL del rewrite. No se debe ejecutar una migración para este despliegue.
Configura el mínimo privilegio de base de datos compatible con las operaciones
actuales y revisa SSL, respaldos, recuperación y políticas de acceso de
Supabase. No asumas que RLS por sí solo protege consultas hechas por SQLAlchemy
con una conexión PostgreSQL directa.

## Configuración de Vercel

1. Crea el proyecto Vercel seleccionando este repositorio y establece **Root
   Directory** en `frontend`. Selecciona el preset Vite (si se solicita), el
   build `npm run build` y el output `dist`. Revisa los costos y límites del
   plan antes de confirmar.
2. La primera publicación estática de Vercel puede hacerse con el marcador de
   Render aún presente para obtener el dominio HTTPS de producción. En ese
   estado, la API todavía no funcionará; no compartas el enlace.
3. No configures `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY` ni otras
   credenciales en Vercel. No hace falta una variable `VITE_*` para producción:
   el cliente usa rutas relativas `/api/...`.
4. Crea el servicio Render desde `render.yaml`. Al ingresar `CORS_ORIGINS`,
   utiliza el dominio HTTPS exacto de producción Vercel, sin barra final.
   Proporciona `DATABASE_URL` en el campo de secreto y espera a que pase
   `/api/health`.
5. Copia el host que Render realmente asignó, sin `https://`, a
   `REPLACE_WITH_RENDER_HOST` en `frontend/vercel.json`; conserva `/api/$1`.
   Despliega de nuevo Vercel para activar el proxy.
6. No compartas el enlace hasta verificar login, restauración de sesión,
   logout, proxy, permisos por rol y el checklist de privacidad de abajo.

La URL asignada por Render no se conoce antes de crear el servicio; no se debe
adivinar ni sustituir por una URL inventada. Por eso el rewrite contiene un
marcador que el responsable reemplaza con el host real.

## Primer acceso y cuentas

No hay alta pública de cuentas. La primera cuenta administrativa se crea solo
como paso manual autorizado por el responsable. Después de configurar Render y
verificar la conexión, abre el Shell del servicio si está disponible y, desde
su raíz `backend`, ejecuta:

```sh
flask crear-admin
```

El comando comprueba que todavía no exista un administrador, solicita usuario
y datos de nombre de forma interactiva, pide dos veces una contraseña de al
menos 12 caracteres sin mostrarla y la guarda con Argon2id. **Este comando
escribe en la base. No lo ejecutes hasta que el responsable autorice crear la
cuenta inicial.** No pases contraseñas como argumentos ni las pegues en logs.
Si el plan no ofrece Shell, acuerda con el responsable un método administrativo
autorizado; no compartas la URI de Supabase para resolverlo.

Después de crear el administrador, las cuentas de compañeros deben crearse
desde la aplicación por una persona administradora. Cada persona debe tener su
propia cuenta y el rol mínimo necesario; no se deben compartir cuentas.

## Verificación manual antes de compartir

- [ ] La URL de rewrite contiene el host Render asignado y no el marcador.
- [ ] Vercel usa HTTPS, `frontend/` como root y `dist` como salida.
- [ ] Render usa HTTPS, `backend/`, Python `3.12.11`, Gunicorn y
      `/api/health`; no se publica el health check de base como ruta del proveedor.
- [ ] En Render existen las dos claves aleatorias distintas, la URI de
      Supabase, `RECEPTION_CLINIC_ID=1` y un solo `CORS_ORIGINS` exacto.
- [ ] `DATABASE_URL` y claves no aparecen en Vercel, el código, Git, el bundle
      frontend ni los logs.
- [ ] Se deshabilitaron los Preview Deployments o se bloqueó que lleguen a la
      API de producción.
- [ ] El responsable confirmó que la base Supabase seleccionada contiene solo
      registros sintéticos autorizados; si no puede confirmarlo, no se conecta.
- [ ] `/login` y una URL de React Router cargan al abrirlas y recargarlas.
- [ ] Login, restauración después de recargar y logout funcionan en el dominio
      HTTPS; la cookie conserva `HttpOnly`, `Secure`, `SameSite=Strict` y
      `Path=/api/auth`.
- [ ] Se comprueban los permisos de administrador, recepción y médico con
      cuentas sintéticas independientes.
- [ ] Solo se cargaron registros sintéticos persistidos; el dashboard muestra
      métricas agregadas y no datos personales o clínicos.
- [ ] El responsable revisó el aviso de privacidad, respaldo/restauración,
      monitoreo sin datos sensibles y procedimiento para desactivar el piloto.
- [ ] Se revisaron los costos, límites, suspensión por inactividad y opciones
      de protección de cada proveedor antes de compartir la URL.

## Límites conocidos

- La base conectada es la existente en Supabase; no se ha preparado una copia
  separada para este despliegue. No uses datos de pacientes reales para
  compensarlo.
- La ruta de health check comprueba la aplicación, no la conectividad de
  PostgreSQL.
- No se ha probado el comportamiento concurrente real de PostgreSQL en una
  instancia aislada.
- La verificación de esta guía no despliega servicios, crea cuentas ni escribe
  datos en Supabase.

## Referencias oficiales

- [Render: desplegar Flask](https://render.com/docs/deploy-flask)
- [Render: versiones de Python](https://render.com/docs/python-version)
- [Render: Blueprints](https://render.com/docs/blueprint-spec)
- [Render: variables de entorno](https://render.com/docs/configure-environment-variables)
- [Render: health checks](https://render.com/docs/health-checks)
- [Vercel: `vercel.json` y rewrites](https://vercel.com/docs/project-configuration/vercel-json)
- [Gunicorn: instalación y versión mínima de Python](https://gunicorn.org/install/)
- [Supabase: conexión a PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)
