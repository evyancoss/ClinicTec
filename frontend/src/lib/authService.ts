import { api } from "./api";

export interface PerfilAutenticado {
  id_usuario: number;
  nombre: string;
  ape_paterno: string;
  ape_materno: string;
  rol: "administrador" | "recepcion" | "medicos";
}

export interface LoginResponse {
  access_token: string;
  token_type: "Bearer";
  perfil: PerfilAutenticado;
}

export const authService = {
  iniciarSesion: (usuario: string, contrasena: string) =>
    api.post<LoginResponse>("/api/auth/login", { usuario, contrasena }),
};
