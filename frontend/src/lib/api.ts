/**
 * lib/api.ts
 * Cliente HTTP centralizado para la API de ClinicTec.
 *
 * - La URL base se configura desde VITE_API_URL (no expone secretos del backend).
 * - El access token se adjunta automáticamente desde el AuthContext.
 * - Los errores devuelven el mensaje del campo `error` de la respuesta.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

/** Token en memoria — se actualiza desde AuthContext al hacer login. */
let _accessToken: string | null = null;
let _unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  _unauthorizedHandler = handler;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include", // necesario para la cookie de refresh
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !path.startsWith("/api/auth/")) {
      _unauthorizedHandler?.();
    }

    try {
      return await res.json() as ApiResponse<T>;
    } catch {
      return {
        data: null,
        error: `Respuesta inválida del servidor (${res.status}).`,
        status: res.status,
      };
    }
  } catch {
    return {
      data: null,
      error: "No se pudo conectar con el servidor. Intenta de nuevo.",
      status: 0,
    };
  }
}

export const api = {
  get:    <T>(path: string) => request<T>("GET", path),
  post:   <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put:    <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
