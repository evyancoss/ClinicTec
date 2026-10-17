import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { usuariosService } from "./usuariosService";

vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("usuariosService.editar", () => {
  beforeEach(() => {
    vi.mocked(api.put).mockReset();
  });

  it("actualiza solo los datos permitidos usando el endpoint existente de usuarios", async () => {
    const datos = {
      id_usuario: 5,
      nombre: "Nombre",
      ape_paterno: "Apellido",
      ape_materno: "Prueba",
      usuario: "cuenta",
      rol: "recepcion" as const,
      medico: null,
    };
    vi.mocked(api.put).mockResolvedValue({
      data: datos,
      error: null,
      status: 200,
    });

    await expect(usuariosService.editar(5, {
      nombre: "Nombre",
      ape_paterno: "Apellido",
      ape_materno: "Prueba",
    })).resolves.toEqual(datos);

    expect(api.put).toHaveBeenCalledWith("/api/usuarios/5", {
      nombre: "Nombre",
      ape_paterno: "Apellido",
      ape_materno: "Prueba",
    });
  });

  it("propaga errores de la API en vez de fingir éxito", async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: null,
      error: "Usuario no encontrado.",
      status: 404,
    });

    await expect(usuariosService.editar(99, {
      nombre: "Nombre",
      ape_paterno: "Apellido",
      ape_materno: "Prueba",
    })).rejects.toThrow("Usuario no encontrado.");
  });
});
