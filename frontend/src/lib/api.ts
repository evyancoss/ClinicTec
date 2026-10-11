/**
 * lib/api.ts
 * Cliente HTTP centralizado para la API de ClinicTec.
 *
 * - La URL base se configura desde VITE_API_URL (no expone secretos del backend).
 * - El access token se adjunta automáticamente desde el AuthContext.
 * - Los errores devuelven el mensaje del campo `error` de la respuesta.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

/** Token en memoria — se actualiza desde AuthContext al hacer login. */
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
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

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include", // necesario para la cookie de refresh
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Algunos errores de red no tienen body JSON
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    json = {
      data: null,
      error: `Error de red (${res.status})`,
      status: res.status,
    };
  }

  return json;
}

export const api = {
  get:    <T>(path: string) => request<T>("GET", path),
  post:   <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put:    <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
