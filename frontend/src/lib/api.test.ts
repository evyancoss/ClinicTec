import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from "./api";

describe("cliente API", () => {
  afterEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it("adjunta el token en memoria sin persistirlo en localStorage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ data: [], error: null, status: 200 }),
    });
    const storageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("localStorage", storageMock);
    setAccessToken("token-de-prueba");

    await api.get("/api/citas?fecha=2026-10-17");

    expect(getAccessToken()).toBe("token-de-prueba");
    expect(storageMock.getItem).not.toHaveBeenCalled();
    expect(storageMock.setItem).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/citas?fecha=2026-10-17"),
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer token-de-prueba",
        }),
      })
    );
  });

  it("notifica una sesión no autorizada en rutas protegidas, no en auth", async () => {
    const unauthorized = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ data: null, error: "No autorizado.", status: 401 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setUnauthorizedHandler(unauthorized);

    await api.get("/api/usuarios/");
    expect(unauthorized).toHaveBeenCalledTimes(1);

    await api.post("/api/auth/refresh", {});
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});
