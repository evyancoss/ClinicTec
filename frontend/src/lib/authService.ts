import { api } from "./api";
import type { PerfilAutenticado } from "../types";

export type { PerfilAutenticado } from "../types";

export interface LoginResponse {
  access_token: string;
  token_type: "Bearer";
  perfil: PerfilAutenticado;
}

export const authService = {
  iniciarSesion: (usuario: string, contrasena: string) =>
    api.post<LoginResponse>("/api/auth/login", { usuario, contrasena }),
  cerrarSesion: () => api.post<{ mensaje: string }>("/api/auth/logout", {}),
};
