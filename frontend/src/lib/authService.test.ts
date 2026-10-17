import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken } from "./api";
import { authService } from "./authService";

const perfil = {
  id_usuario: 14,
  nombre: "Cuenta",
  ape_paterno: "Prueba",
  ape_materno: "Local",
  rol: "medicos" as const,
  id_medico: 7,
  id_clinica: 3,
};

function respuesta(data: unknown, status = 200) {
  return {
    status,
    json: async () => ({ data, error: status === 200 ? null : "Sesión expirada.", status }),
  };
}

describe("authService.restaurarSesion", () => {
  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it("renueva con la cookie HttpOnly y obtiene el perfil real desde /me", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respuesta({ access_token: "nuevo-token", token_type: "Bearer" }))
      .mockResolvedValueOnce(respuesta(perfil));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authService.restaurarSesion()).resolves.toEqual(perfil);
    expect(getAccessToken()).toBe("nuevo-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/auth/refresh");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(fetchMock.mock.calls[1][0]).toContain("/api/auth/me");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({
        Authorization: expect.stringContaining("nuevo-token"),
      }),
    });
  });

  it("borra el token y no consulta el perfil si el refresh expiró", async () => {
    setAccessToken("token-viejo");
    const fetchMock = vi.fn().mockResolvedValueOnce(respuesta(null, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authService.restaurarSesion()).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
