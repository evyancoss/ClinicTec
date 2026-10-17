import { api, type ApiResponse } from "./api";

export type RolCuenta = "administrador" | "recepcion" | "medicos";

export interface UsuarioSistema {
  id_usuario: number;
  nombre: string;
  ape_paterno: string;
  ape_materno: string;
  usuario: string;
  rol: RolCuenta;
  medico: {
    id_clinica: number;
    nombre_clinica: string;
    especialidad: string;
    correo: string | null;
    estado: boolean | null;
  } | null;
}

export interface ClinicaOpcion {
  id_clinica: number;
  nombre: string;
}

export interface AltaUsuario {
  nombre: string;
  ape_paterno: string;
  ape_materno: string;
  usuario: string;
  contrasena: string;
  rol: RolCuenta;
  id_clinica?: number;
  especialidad?: string;
  cedula_profesional?: string;
  telefono?: string;
  correo?: string;
}

export type EdicionUsuario = Pick<
  UsuarioSistema,
  "nombre" | "ape_paterno" | "ape_materno"
>;

async function extraerDatos<T>(respuesta: ApiResponse<T>): Promise<T> {
  if (respuesta.error || respuesta.data === null) {
    throw new Error(respuesta.error ?? "Respuesta inesperada del servidor.");
  }
  return respuesta.data;
}

export const usuariosService = {
  async listar(): Promise<UsuarioSistema[]> {
    return extraerDatos(await api.get<UsuarioSistema[]>("/api/usuarios/"));
  },

  async listarClinicas(): Promise<ClinicaOpcion[]> {
    return extraerDatos(await api.get<ClinicaOpcion[]>("/api/usuarios/clinicas"));
  },

  async crear(datos: AltaUsuario): Promise<UsuarioSistema> {
    return extraerDatos(
      await api.post<UsuarioSistema>("/api/usuarios/", datos),
    );
  },

  async editar(idUsuario: number, datos: EdicionUsuario): Promise<UsuarioSistema> {
    return extraerDatos(
      await api.put<UsuarioSistema>(`/api/usuarios/${idUsuario}`, datos),
    );
  },
};
