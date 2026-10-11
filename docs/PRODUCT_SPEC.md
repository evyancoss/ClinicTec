# ClinicTec — Especificación del Producto

## 1. Visión general

ClinicTec es una aplicación web multi-rol para la gestión de clínicas médicas. Permite administrar pacientes, citas, consultas y recetas desde una interfaz unificada, adaptada a las responsabilidades de cada tipo de usuario.

---

## 2. Roles y permisos

### 2.1 Administrador

| Acción | Permitido |
|---|---|
| Ver dashboard con indicadores por clínica | ✅ |
| Crear, editar y desactivar clínicas | ✅ |
| Dar de alta usuarios (cualquier rol) | ✅ |
| Desactivar y reactivar cuentas de usuario | ✅ |
| Ver todas las clínicas y sus datos | ✅ |
| Consultar y administrar datos básicos de pacientes | ✅ |
| Acceder al historial clínico | ❌ |
| Registrar citas o consultas | ❌ |

### 2.2 Recepción

| Acción | Permitido |
|---|---|
| Ver agenda diaria de la clínica | ✅ |
| Registrar nuevos pacientes | ✅ |
| Crear, reagendar y cancelar citas | ✅ |
| Marcar citas como atendidas | ✅ |
| Asignar médico a una cita | ✅ |
| Ver información básica del paciente | ✅ |
| Ver historial clínico del paciente | ❌ |
| Registrar consultas o recetas | ❌ |
| Acceder a datos de otras clínicas | ❌ |

### 2.3 Médico

| Acción | Permitido |
|---|---|
| Ver su propia agenda diaria y futura | ✅ |
| Ver perfil e historial de sus pacientes | ✅ |
| Registrar consultas y diagnósticos | ✅ |
| Registrar tratamientos y recetas | ✅ |
| Ver únicamente los pacientes asignados a él | ✅ |
| Ver datos de otros médicos | ❌ |
| Registrar o modificar citas | ❌ |
| Acceder a funciones administrativas | ❌ |

---

## 3. Pantallas por módulo

### 3.1 Autenticación (todos los roles)

- **Login** — Formulario de correo y contraseña. Redirige según rol.
- **Recuperar contraseña** — Envío de enlace por correo (fase posterior).

### 3.2 Módulo Recepción

| Pantalla | Descripción |
|---|---|
| Agenda diaria | Vista de citas del día, filtrable por médico. |
| Nueva cita | Formulario para registrar una cita (paciente, médico, fecha/hora, motivo). |
| Editar / reagendar cita | Modificar fecha, hora o médico de una cita existente. |
| Cancelar cita | Cambiar estado a "cancelada" con motivo opcional. |
| Marcar como atendida | Cambiar estado de la cita a "atendida". |
| Registro de paciente | Formulario de alta de nuevo paciente. |
| Búsqueda de paciente | Buscar por nombre, ID o número de expediente. |

### 3.3 Módulo Médico

| Pantalla | Descripción |
|---|---|
| Mi agenda | Vista de sus citas del día y futuras. |
| Perfil del paciente | Datos personales, antecedentes y contacto de emergencia. |
| Historial clínico | Listado de consultas previas del paciente. |
| Nueva consulta | Formulario: motivo, exploración, diagnóstico, tratamiento. |
| Recetas | Listado de medicamentos y dosis dentro de la consulta. |

### 3.4 Módulo Administrador

| Pantalla | Descripción |
|---|---|
| Dashboard | Indicadores: citas del día, pacientes nuevos, médicos activos, ingresos. |
| Gestión de clínicas | Listado de clínicas; crear, editar o desactivar. |
| Gestión de usuarios | Listado de usuarios; alta, edición, desactivar/reactivar. |

---

## 4. Reglas de negocio

### Citas

1. Una cita pertenece a una sola clínica.
2. Un médico no puede tener dos citas al mismo tiempo en la misma clínica.
3. Los estados válidos de una cita son: `programada`, `atendida`, `cancelada`, `reagendada`.
4. Solo recepción puede crear, reagendar o cancelar citas.
5. Solo el médico asignado puede registrar la consulta de esa cita.
6. Una cita cancelada no puede ser atendida; debe crearse una nueva.

### Pacientes

1. `id_paciente` es la clave primaria; el esquema real no tiene una columna `numero_expediente`.
2. El paciente no se relaciona directamente con una clínica; la clínica se obtiene desde sus citas.
3. Administración y recepción pueden consultar y gestionar datos básicos del paciente.
4. El médico solo puede consultar pacientes vinculados a sus propias citas y recibe los datos mínimos para su atención.
5. No se permite el borrado físico predeterminado de pacientes.
6. La consulta del historial clínico se implementará en la Fase 7.

### Usuarios

1. Un usuario pertenece a una clínica principal (puede ampliarse en fases futuras).
2. Los usuarios desactivados no pueden iniciar sesión.
3. Solo el administrador puede cambiar el rol de un usuario.
4. Las contraseñas deben almacenarse con hash (bcrypt o Argon2); nunca en texto plano.

### Recetas

1. Una receta pertenece a una consulta.
2. Cada línea del detalle de receta es un medicamento con dosis e instrucciones.
3. Una receta no puede modificarse tras ser emitida (solo el médico que la creó puede hacerlo durante la sesión activa, a definir en fase posterior).

---

## 5. Flujos principales

### Flujo: registrar una cita

```
Recepción
  → Busca paciente (o crea uno nuevo)
  → Selecciona médico disponible
  → Elige fecha y hora
  → Confirma cita (estado: programada)
```

### Flujo: atender una consulta

```
Médico
  → Abre su agenda diaria
  → Selecciona la cita programada
  → Accede al perfil del paciente
  → Registra consulta (síntomas, exploración, diagnóstico, tratamiento)
  → Agrega receta si aplica
  → Guarda (la cita pasa a estado: atendida)
```

### Flujo: alta de usuario (administrador)

```
Administrador
  → Accede a Gestión de usuarios
  → Crea nuevo usuario (nombre, correo, rol, clínica)
  → El sistema genera credenciales temporales o enlace de activación
  → El usuario activa su cuenta en el primer acceso
```

---

## 6. Restricciones técnicas

- El backend debe validar roles en cada endpoint; el frontend no es el único guardián.
- Toda operación sensible requiere token JWT válido (o sesión activa).
- El sistema debe manejar zonas horarias (las clínicas pueden estar en diferentes regiones).
- Paginación obligatoria en listados con más de 20 registros.
- Las respuestas de la API deben seguir el formato `{ data, error, status }`.

---

## 7. Pendientes para siguientes fases

- [ ] Definir estrategia de autenticación: JWT + refresh token o sesiones Flask.
- [ ] Confirmar columnas exactas de cada tabla inspeccionando el esquema real.
- [ ] Definir si un médico puede pertenecer a varias clínicas simultáneamente.
- [ ] Definir política de retención de datos (¿cuánto tiempo se guardan las consultas?).
- [ ] Diseñar flujo de recuperación de contraseña.
- [ ] Evaluar necesidad de notificaciones (email/SMS) para recordatorio de citas.
