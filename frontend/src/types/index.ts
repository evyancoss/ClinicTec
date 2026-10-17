// ─── Roles del sistema ───────────────────────────────────────────────────────
export type Rol = "administrador" | "recepcion" | "medico";
export type RolCuenta = "administrador" | "recepcion" | "medicos";

export function rolVisualDeCuenta(rol: unknown): Rol | null {
  if (rol === "administrador" || rol === "recepcion") return rol;
  if (rol === "medicos") return "medico";
  return null;
}

export function rutaInicioDeRol(rol: Rol): string {
  const rutas: Record<Rol, string> = {
    administrador: "/admin/dashboard",
    recepcion: "/recepcion/agenda",
    medico: "/medico/agenda",
  };
  return rutas[rol];
}

// ─── Estado de demostración ───────────────────────────────────────────────────
export interface UsuarioDemo {
  id: number;
  nombre: string;
  rol: Rol;
  clinica: string;
  avatar: string;
}

export interface PerfilAutenticado {
  id_usuario: number;
  nombre: string;
  ape_paterno: string;
  ape_materno: string;
  rol: "administrador" | "recepcion" | "medicos";
  id_medico?: number;
  id_clinica?: number;
}

// ─── Citas ────────────────────────────────────────────────────────────────────
export type EstadoCita = "Agendada" | "Atendida" | "Cancelada" | "Reagendada";

export interface Cita {
  id_cita: number;
  id_paciente: number;
  nombre_paciente: string;
  id_medico: number;
  nombre_medico: string;
  id_clinica: number;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: EstadoCita;
}

export interface PaginacionCitas {
  pagina: number;
  por_pagina: number;
  total: number;
  paginas: number;
}

// ─── Pacientes ────────────────────────────────────────────────────────────────
export interface Paciente {
  id: number;
  nombre: string;
  expediente: string;
  fechaNacimiento: string;
  telefono: string;
  ultimaVisita: string;
  medico?: string;
}

// ─── Médicos ──────────────────────────────────────────────────────────────────
export interface Medico {
  id: number;
  nombre: string;
  especialidad: string;
  telefono: string;
  activo: boolean;
}

// ─── Indicadores del dashboard ────────────────────────────────────────────────
export interface Indicador {
  titulo: string;
  valor: string | number;
  descripcion: string;
  tendencia?: "subida" | "bajada" | "neutro";
  icono: string;
}

// ─── Contexto de demostración ─────────────────────────────────────────────────
export interface DemoContextType {
  autenticacionCargando: boolean;
  rolActivo: Rol;
  setRolActivo: (rol: Rol) => void;
  autenticado: boolean;
  setAutenticado: (v: boolean) => void;
  modoDemo: boolean;
  setModoDemo: (v: boolean) => void;
  usuarioAutenticado: PerfilAutenticado | null;
  setUsuarioAutenticado: (perfil: PerfilAutenticado | null) => void;
  usuarioActivo: UsuarioDemo;
}
