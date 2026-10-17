import { api, type ApiResponse } from "./api";

export interface DashboardAdmin {
  fecha: string;
  resumen: {
    citas_hoy: number;
    pacientes_nuevos_mes: number;
    medicos_activos: number;
    clinicas_activas: number;
  };
  actividad_por_clinica: Array<{
    id_clinica: number;
    nombre: string;
    activa: boolean;
    citas_hoy: number;
    pacientes_con_cita_hoy: number;
    medicos_activos: number;
  }>;
  citas_por_estado: Array<{ estado: string; total: number }>;
}

export interface ClinicaAPI {
  id_clinica: number;
  nombre: string;
  direccion: string;
  telefono: string | null;
  activa: boolean;
  medicos_activos: number;
  pacientes_con_cita: number;
}

async function exigirDatos<T>(response: ApiResponse<T>): Promise<T> {
  if (response.error || response.data === null) {
    throw new Error(response.error ?? "Respuesta inesperada del servidor.");
  }
  return response.data;
}

export const adminService = {
  async dashboard(): Promise<DashboardAdmin> {
    return exigirDatos(await api.get<DashboardAdmin>("/api/admin/dashboard"));
  },
  async clinicas(): Promise<ClinicaAPI[]> {
    return exigirDatos(await api.get<ClinicaAPI[]>("/api/clinicas/"));
  },
};
