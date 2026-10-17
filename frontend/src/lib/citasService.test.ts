import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { citasService } from "./citasService";

vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("citasService", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("consulta las citas por fecha y paginación usando la API central", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: null,
      error: null,
      status: 200,
    });

    await citasService.listar("2026-10-17", 2, 10);

    expect(api.get).toHaveBeenCalledWith(
      "/api/citas?fecha=2026-10-17&pagina=2&por_pagina=10"
    );
  });

  it("consulta el detalle por el endpoint existente", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: null,
      error: null,
      status: 200,
    });

    await citasService.obtener(42);

    expect(api.get).toHaveBeenCalledWith("/api/citas/42");
  });

  it("solicita la cancelación al endpoint de escritura existente", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: null,
      error: null,
      status: 200,
    });

    await citasService.cancelar(42);

    expect(api.post).toHaveBeenCalledWith("/api/citas/42/cancelar", {});
  });

  it("registra una cita con la carga tipada usando el cliente API compartido", async () => {
    const datos = {
      id_paciente: 3,
      id_medico: 7,
      fecha: "2026-10-17",
      hora: "10:00",
      motivo: "Consulta",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: null,
      error: null,
      status: 201,
    });

    await citasService.crear(datos);

    expect(api.post).toHaveBeenCalledWith("/api/citas", datos);
  });

  it("reprograma la cita existente enviando solo fecha y hora", async () => {
    const datos = { fecha: "2026-10-20", hora: "11:30" };
    vi.mocked(api.post).mockResolvedValue({
      data: null,
      error: null,
      status: 200,
    });

    await citasService.reprogramar(42, datos);

    expect(api.post).toHaveBeenCalledWith(
      "/api/citas/42/reprogramar",
      datos,
    );
  });
});
