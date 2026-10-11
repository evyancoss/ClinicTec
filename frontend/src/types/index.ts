// ─── Roles del sistema ───────────────────────────────────────────────────────
export type Rol = "administrador" | "recepcion" | "medico";

// ─── Estado de demostración ───────────────────────────────────────────────────
export interface UsuarioDemo {
  id: number;
  nombre: string;
  rol: Rol;
  clinica: string;
  avatar: string;
}

// ─── Citas ────────────────────────────────────────────────────────────────────
export type EstadoCita = "programada" | "atendida" | "cancelada" | "reagendada";

export interface Cita {
  id: number;
  paciente: string;
  medico: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: EstadoCita;
  clinica?: string;
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
  rolActivo: Rol;
  setRolActivo: (rol: Rol) => void;
  autenticado: boolean;
  setAutenticado: (v: boolean) => void;
  usuarioActivo: UsuarioDemo;
}
