# ClinicTec — Esquema Real de la Base de Datos

> Generado automáticamente el 2026-10-11 08:19
> por `app/utils/inspect_schema.py`. No editar manualmente.

## `citas`

**PK:** `id_cita`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_cita` | `INTEGER` | No | `—` |
| `id_paciente` | `INTEGER` | No | `—` |
| `id_medico` | `INTEGER` | No | `—` |
| `id_clinica` | `INTEGER` | No | `—` |
| `fecha` | `DATE` | No | `—` |
| `hora` | `TIME` | No | `—` |
| `motivo` | `VARCHAR(255)` | Sí | `—` |
| `estado` | `VARCHAR(20)` | No | `'Agendada'::character varying` |
| `fecha_registro` | `TIMESTAMP` | Sí | `CURRENT_TIMESTAMP` |

**Claves foráneas:**

- `id_clinica` → `clinicas.id_clinica`
- `id_medico` → `medicos.id_medico`
- `id_paciente` → `pacientes.id_paciente`

## `clinicas`

**PK:** `id_clinica`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_clinica` | `INTEGER` | No | `—` |
| `nombre` | `VARCHAR(150)` | No | `—` |
| `direccion` | `VARCHAR(255)` | No | `—` |
| `telefono` | `VARCHAR(20)` | Sí | `—` |
| `correo` | `VARCHAR(100)` | Sí | `—` |
| `estado` | `BOOLEAN` | Sí | `true` |

## `consultas`

**PK:** `id_consulta`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_consulta` | `INTEGER` | No | `—` |
| `id_cita` | `INTEGER` | No | `—` |
| `fecha_consulta` | `TIMESTAMP` | Sí | `CURRENT_TIMESTAMP` |
| `motivo` | `TEXT` | Sí | `—` |
| `diagnostico` | `TEXT` | Sí | `—` |
| `observaciones` | `TEXT` | Sí | `—` |
| `tratamiento` | `TEXT` | Sí | `—` |

**Claves foráneas:**

- `id_cita` → `citas.id_cita`

## `detalle_receta`

**PK:** `id_detalle`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_detalle` | `INTEGER` | No | `—` |
| `id_receta` | `INTEGER` | No | `—` |
| `medicamento` | `VARCHAR(150)` | No | `—` |
| `dosis` | `VARCHAR(100)` | Sí | `—` |
| `frecuencia` | `VARCHAR(100)` | Sí | `—` |
| `duracion` | `VARCHAR(100)` | Sí | `—` |
| `indicaciones` | `TEXT` | Sí | `—` |

**Claves foráneas:**

- `id_receta` → `recetas.id_receta`

## `medicos`

**PK:** `id_medico`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_medico` | `INTEGER` | No | `—` |
| `id_usuario` | `INTEGER` | Sí | `—` |
| `id_clinica` | `INTEGER` | No | `—` |
| `nombre` | `VARCHAR(100)` | No | `—` |
| `ape_paterno` | `VARCHAR(100)` | No | `—` |
| `ape_materno` | `VARCHAR(100)` | No | `—` |
| `especialidad` | `VARCHAR(100)` | No | `—` |
| `cedula_profesional` | `VARCHAR(50)` | No | `—` |
| `telefono` | `VARCHAR(20)` | Sí | `—` |
| `correo` | `VARCHAR(100)` | Sí | `—` |
| `estado` | `BOOLEAN` | Sí | `true` |

**Claves foráneas:**

- `id_clinica` → `clinicas.id_clinica`
- `id_usuario` → `usuarios.id_usuario`

## `pacientes`

**PK:** `id_paciente`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_paciente` | `INTEGER` | No | `—` |
| `nombre` | `VARCHAR(100)` | No | `—` |
| `ape_paterno` | `VARCHAR(100)` | No | `—` |
| `ape_materno` | `VARCHAR(100)` | No | `—` |
| `fecha_nacimiento` | `DATE` | No | `—` |
| `sexo` | `VARCHAR(10)` | No | `—` |
| `telefono` | `VARCHAR(20)` | Sí | `—` |
| `correo` | `VARCHAR(100)` | Sí | `—` |
| `direccion` | `VARCHAR(255)` | Sí | `—` |
| `fecha_registro` | `TIMESTAMP` | Sí | `CURRENT_TIMESTAMP` |
| `estado` | `BOOLEAN` | Sí | `true` |

## `recetas`

**PK:** `id_receta`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_receta` | `INTEGER` | No | `—` |
| `id_consulta` | `INTEGER` | No | `—` |
| `fecha_receta` | `TIMESTAMP` | Sí | `CURRENT_TIMESTAMP` |
| `indicaciones` | `TEXT` | Sí | `—` |

**Claves foráneas:**

- `id_consulta` → `consultas.id_consulta`

## `usuarios`

**PK:** `id_usuario`

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `id_usuario` | `INTEGER` | No | `—` |
| `nombre` | `VARCHAR(100)` | No | `—` |
| `ape_paterno` | `VARCHAR(100)` | No | `—` |
| `ape_materno` | `VARCHAR(100)` | No | `—` |
| `rol` | `VARCHAR(20)` | No | `—` |
| `usuario` | `VARCHAR(100)` | No | `—` |
| `contrasena` | `VARCHAR(255)` | No | `—` |
| `fecha_registro` | `TIMESTAMP` | Sí | `CURRENT_TIMESTAMP` |
