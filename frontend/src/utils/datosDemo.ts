/**
 * datosDemo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Datos ficticios para la demostración visual de ClinicTec.
 * NINGÚN dato aquí representa información clínica real.
 * No se conectan a ninguna base de datos.
 */

import type { Cita, Paciente, Medico } from "../types";

export const CITAS_DEMO: Cita[] = [
  {
    id: 1,
    paciente: "Roberto Hernández",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-10",
    hora: "09:00",
    motivo: "Consulta general",
    estado: "programada",
  },
  {
    id: 2,
    paciente: "Sofía Ramírez",
    medico: "Dr. Marcos Torres",
    fecha: "2026-10-10",
    hora: "09:30",
    motivo: "Control de presión",
    estado: "atendida",
  },
  {
    id: 3,
    paciente: "Eduardo Castillo",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-10",
    hora: "10:00",
    motivo: "Revisión de resultados",
    estado: "cancelada",
  },
  {
    id: 4,
    paciente: "María José López",
    medico: "Dr. Marcos Torres",
    fecha: "2026-10-10",
    hora: "10:30",
    motivo: "Seguimiento tratamiento",
    estado: "reagendada",
  },
  {
    id: 5,
    paciente: "Fernando Gutiérrez",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-10",
    hora: "11:00",
    motivo: "Primera consulta",
    estado: "programada",
  },
  {
    id: 6,
    paciente: "Isabela Moreno",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-10",
    hora: "11:30",
    motivo: "Dolor abdominal",
    estado: "programada",
  },
];

export const PACIENTES_DEMO: Paciente[] = [
  {
    id: 1,
    nombre: "Roberto Hernández",
    expediente: "EXP-001",
    fechaNacimiento: "1985-03-14",
    telefono: "555-1001",
    ultimaVisita: "2026-09-15",
    medico: "Dra. Laura Vega",
  },
  {
    id: 2,
    nombre: "Sofía Ramírez",
    expediente: "EXP-002",
    fechaNacimiento: "1992-07-22",
    telefono: "555-1002",
    ultimaVisita: "2026-10-10",
    medico: "Dr. Marcos Torres",
  },
  {
    id: 3,
    nombre: "Eduardo Castillo",
    expediente: "EXP-003",
    fechaNacimiento: "1978-11-05",
    telefono: "555-1003",
    ultimaVisita: "2026-10-05",
    medico: "Dra. Laura Vega",
  },
  {
    id: 4,
    nombre: "María José López",
    expediente: "EXP-004",
    fechaNacimiento: "2001-01-30",
    telefono: "555-1004",
    ultimaVisita: "2026-10-01",
    medico: "Dr. Marcos Torres",
  },
  {
    id: 5,
    nombre: "Fernando Gutiérrez",
    expediente: "EXP-005",
    fechaNacimiento: "1968-06-18",
    telefono: "555-1005",
    ultimaVisita: "2026-08-20",
    medico: "Dra. Laura Vega",
  },
];

export const MEDICOS_DEMO: Medico[] = [
  {
    id: 1,
    nombre: "Dra. Laura Vega",
    especialidad: "Medicina General",
    telefono: "555-2001",
    activo: true,
  },
  {
    id: 2,
    nombre: "Dr. Marcos Torres",
    especialidad: "Cardiología",
    telefono: "555-2002",
    activo: true,
  },
  {
    id: 3,
    nombre: "Dra. Pamela Ruiz",
    especialidad: "Pediatría",
    telefono: "555-2003",
    activo: false,
  },
];

export const PROXIMAS_CITAS_DEMO: Cita[] = [
  {
    id: 7,
    paciente: "Claudia Mendoza",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-11",
    hora: "09:00",
    motivo: "Control mensual",
    estado: "programada",
  },
  {
    id: 8,
    paciente: "Ramón Díaz",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-12",
    hora: "10:00",
    motivo: "Revisión post-operatoria",
    estado: "programada",
  },
  {
    id: 9,
    paciente: "Patricia Fuentes",
    medico: "Dra. Laura Vega",
    fecha: "2026-10-13",
    hora: "11:30",
    motivo: "Análisis de laboratorio",
    estado: "programada",
  },
];
