# Piloto web escolar: privacidad y despliegue

## Alcance

ClinicTec puede desplegarse para que compañeros y docentes prueben flujos con cuentas autenticadas y registros persistidos en PostgreSQL. La versión pública debe considerarse un **piloto escolar**, no un sistema clínico profesional ni un servicio de atención médica.

Para un piloto abierto, usa identidades y expedientes sintéticos (inventados y claramente marcados como datos de prueba), aunque las operaciones sean reales y se guarden en Supabase. No cargues nombres, teléfonos, correos, domicilios, diagnósticos, recetas ni expedientes de pacientes reales. Los datos de salud reciben protección reforzada en la legislación mexicana; el responsable del proyecto debe confirmar el aviso de privacidad, la base legal y las obligaciones aplicables antes de tratar datos personales reales. Consulta la [LFPDPPP vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) y pide orientación institucional/legal si el alcance cambia.

## Controles incorporados

- El dashboard consulta conteos agregados y no devuelve identidad, expediente ni detalle médico de pacientes.
- La pantalla de clínicas consulta el catálogo y totales derivados de citas; no expone filas de pacientes.
- Las consultas de administrador y clínicas requieren autenticación y rol de administrador.
- La lista de médicos para recepción queda limitada en el servidor a `RECEPTION_CLINIC_ID`.
- Se quitó del login el acceso visible a la demostración. No existe auto-registro público; las cuentas se crean desde la administración.
- El arranque en `FLASK_ENV=production` exige claves distintas y fuertes, conexión PostgreSQL, origen CORS configurado y clínica operativa. Cookies de sesión usan HTTPS.

## Antes de compartir el enlace

1. Despliega en un proveedor que soporte frontend estático y un proceso WSGI para Flask. Configura HTTPS en ambos dominios. Desde `backend/`, inicia Flask con `gunicorn --bind 0.0.0.0:$PORT --workers 2 wsgi:app` (el proveedor debe definir `PORT`). `backend/wsgi.py` exporta la aplicación WSGI.
2. Define variables en el panel de secretos del proveedor, nunca en Git ni en variables `VITE_*`:
   - Backend: `FLASK_ENV=production`, `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS` (origen HTTPS exacto del frontend), `RECEPTION_CLINIC_ID`, `APP_TIMEZONE=America/Mexico_City`.
   - Frontend: `VITE_API_URL` con la URL HTTPS del backend.
   - Genera `SECRET_KEY` y `JWT_SECRET_KEY` de forma independiente. No reutilices los valores de desarrollo.
3. Mantén Supabase accesible solo desde el backend. No coloques la URL de conexión, contraseña PostgreSQL ni claves `service_role` en el frontend. Revisa permisos del rol de conexión y usa el privilegio mínimo necesario.
4. En Supabase revisa Security Advisor, SSL, restricciones de red, MFA de la cuenta propietaria y respaldos/restauración. Confirma con pruebas que las tablas y roles expuestos están protegidos. La conexión directa del backend a PostgreSQL no se vuelve segura solo por activar RLS; verifica qué rol usa SQLAlchemy y qué políticas aplican. Sigue la [lista oficial de producción de Supabase](https://supabase.com/docs/guides/deployment/going-into-prod) y su [modelo de responsabilidad compartida](https://supabase.com/docs/guides/deployment/shared-responsibility-model).
5. Crea cuentas individuales, contraseñas largas y roles mínimos. No compartas usuarios administradores ni publiques credenciales de prueba. El acceso público a la URL no debe permitir registro anónimo.
6. Añade una página visible de privacidad y contacto del responsable antes de invitar personas. Define propósito, categorías de datos, quién accede, plazo de conservación, eliminación, canal de solicitudes y qué hacer ante incidentes. Los textos deben revisarse con la institución; no publiques un aviso legal genérico como si ya estuviera validado.
7. Usa solo datos sintéticos para las demostraciones. Aun con datos sintéticos, no permitas que el formulario acepte contenido clínico real y evita compartir capturas con credenciales o datos identificables.
8. Confirma dominio, costos/límites del proveedor, monitoreo de errores sin cuerpos de petición, respaldo probado y procedimiento para desactivar el sitio y revocar claves.

## Límites conocidos antes del despliegue

- Solo existe una clínica operativa de recepción, indicada por `RECEPTION_CLINIC_ID`. Las pantallas agregadas ya listan clínicas dinámicamente, pero el alta/edición/desactivación de clínicas no está implementada.
- El dashboard agrega métricas; no proporciona reportes históricos ni exportación.
- Las pruebas de concurrencia específicas de PostgreSQL no se ejecutaron contra una instancia aislada. La concurrencia observada con SQLite no sustituye esa validación.
- La reprogramación actual actualiza la misma cita; no mantiene una bitácora de horarios anteriores porque el esquema no contiene historial.
- No se seleccionó aún el proveedor de hosting. Por eso se dejó un punto de entrada WSGI y configuración de producción genérica, sin afirmar que ya está desplegado.

## Consideraciones normativas

Los datos relativos a la salud son datos personales sensibles bajo la legislación mexicana. La NOM-004-SSA3-2012 puede resultar aplicable dependiendo de si el sistema se usa para prestar atención y de quién lo opere; no se debe asumir que un proyecto escolar queda automáticamente fuera de toda obligación. Determina el alcance con la institución antes de ingresar información real. La [norma publicada en el DOF](https://www.dof.gob.mx/copias.php?acc=ajaxPaginas&ed=MATUTINO&edicion=248792&fecha=15%2F10%2F2012&paginas=30&seccion=CUARTA) contiene requisitos del expediente clínico, incluyendo su confidencialidad.
