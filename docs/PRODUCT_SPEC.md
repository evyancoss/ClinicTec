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
2. Los estados canónicos almacenados son `Agendada`, `Atendida`, `Cancelada` y `Reagendada`; la interfaz puede traducirlos para presentación.
3. En el esquema actual, cada cita nueva tiene una duración fija de 60 minutos; no se almacena ni acepta una duración enviada por el cliente.
4. No se permiten citas superpuestas para el mismo médico. La API bloquea la fila del médico y comprueba intervalos semiabiertos de 60 minutos dentro de la transacción.
5. En esta instalación, recepción opera sobre la clínica 1 configurada en el servidor; nunca se toma una clínica del cliente.
6. Solo recepción puede crear o cancelar citas. La reprogramación aún no está implementada.
7. Solo el médico asignado puede registrar la consulta de esa cita.
8. Una cita cancelada no puede ser atendida; debe crearse una nueva.

#### Duración, empalmes y reprogramación

La tabla real `citas` conserva `fecha` (`DATE`) y `hora` (`TIME`) sin un campo de duración. Sin alterar el esquema, el servidor aplica la constante `CITA_DURACION_MINUTOS = 60` a las citas nuevas; no se puede modificar por cita hasta que exista una decisión y un cambio de esquema aprobados. Las citas históricas también se interpretan con 60 minutos para detección de empalmes, ya que no hay información de duración histórica disponible.

Los intervalos se comparan como semiabiertos `[inicio, fin)`: dos citas consecutivas cuyo fin e inicio coinciden no se empalman. Se consideran citas del día anterior para cubrir cruces de medianoche. `Agendada` y `Atendida` bloquean; `Cancelada` y `Reagendada` no bloquean. La hora se interpreta como hora local sin zona almacenada; horario de verano y calendarios de atención quedan pendientes de una política.

Al crear una cita, la API bloquea la fila del médico con `SELECT ... FOR UPDATE`, valida clínica, paciente, médico y empalme en la misma transacción, y conserva el bloqueo hasta commit o rollback. La reserva solo se serializa si los futuros escritores aplican el mismo protocolo. Las pruebas SQLite cubren lógica funcional, pero no prueban la semántica concurrente de PostgreSQL; esta debe verificarse en una instancia PostgreSQL aislada, nunca contra Supabase compartido.

La reprogramación no se habilita: `citas` no tiene relación hacia la cita sustituida, así que no se puede auditar inequívocamente la cadena sin definir primero cómo representarla. No se modifica el esquema ni se inventa esa relación en esta fase. Cancelar cambia únicamente `Agendada` a `Cancelada`; no acepta clínica del cliente ni almacena motivo. Casos cubiertos por la validación: citas consecutivas, solapamiento parcial/anidado, mismo inicio, cruce de medianoche, estados que bloquean/liberan horario y rollback al fallar la transacción.

### Pacientes

1. `id_paciente` es la clave primaria; el esquema real no tiene una columna `numero_expediente`.
2. El paciente no se relaciona directamente con una clínica; la clínica se obtiene desde sus citas.
3. Administración y recepción pueden consultar y gestionar datos básicos del paciente.
4. El médico solo puede consultar pacientes vinculados a sus propias citas y recibe los datos mínimos para su atención.
5. No se permite el borrado físico predeterminado de pacientes.
6. La consulta del historial clínico se implementará en la Fase 7.

### Usuarios

1. La tabla `usuarios` no incluye `id_clinica` ni estado/activo. El perfil de médico puede relacionar una cuenta con una clínica por `medicos.id_usuario`; recepción no tiene vínculo de clínica en esta tabla.
2. El administrador puede actualizar nombre y apellidos desde la cuenta; si tiene un perfil médico ligado por `medicos.id_usuario`, el servidor actualiza los nombres duplicados en ambas tablas en la misma transacción.
3. La edición no cambia login, rol, contraseña, clínica, especialidad, cédula ni datos de contacto del perfil médico.
4. El nombre de login (`usuario`), el rol y la contraseña no se modifican desde el formulario ordinario. El login es único; el cambio de contraseña requiere un flujo seguro separado y el rol impacta los privilegios/JWT.
5. No existe una operación confirmada de activar/desactivar cuentas en el esquema actual. El campo `estado` de `medicos` no representa el estado de la cuenta de usuario.
6. Las contraseñas deben almacenarse con hash Argon2id; nunca se exponen hashes ni contraseñas en respuestas.

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
  → Confirma cita (estado: Agendada, duración: 60 minutos)
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
