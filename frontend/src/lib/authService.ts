import { api, setAccessToken } from "./api";
import type { PerfilAutenticado } from "../types";

export type { PerfilAutenticado } from "../types";

export interface LoginResponse {
  access_token: string;
  token_type: "Bearer";
  perfil: PerfilAutenticado;
}

interface RefreshResponse {
  access_token: string;
  token_type: "Bearer";
}

export const authService = {
  iniciarSesion: (usuario: string, contrasena: string) =>
    api.post<LoginResponse>("/api/auth/login", { usuario, contrasena }),
  cerrarSesion: () => api.post<{ mensaje: string }>("/api/auth/logout", {}),
  async restaurarSesion(): Promise<PerfilAutenticado | null> {
    const refresh = await api.post<RefreshResponse>("/api/auth/refresh", {});
    if (refresh.error || !refresh.data?.access_token) {
      setAccessToken(null);
      return null;
    }

    setAccessToken(refresh.data.access_token);
    const perfil = await api.get<PerfilAutenticado>("/api/auth/me");
    if (perfil.error || !perfil.data) {
      setAccessToken(null);
      return null;
    }
    return perfil.data;
  },
};
