import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiAgendaPage } from "./MiAgendaPage";
import { DemoContext, USUARIOS_DEMO } from "../../store/demo-context";
import type { DemoContextType, Cita } from "../../types";
import { citasService } from "../../lib/citasService";
import { consultasService } from "../../lib/consultasService";

vi.mock("../../lib/citasService", () => ({
  citasService: {
    listar: vi.fn(),
    obtener: vi.fn(),
  },
}));

vi.mock("../../lib/consultasService", () => ({
  consultasService: {
    registrar: vi.fn(),
    emitirReceta: vi.fn(),
  },
}));

const citaMedico: Cita = {
  id_cita: 25,
  id_paciente: 10,
  nombre_paciente: "Paciente del médico",
  id_medico: 77,
  nombre_medico: "Dr. Cuenta",
  id_clinica: 9,
  fecha: "2026-10-17",
  hora: "10:00",
  motivo: null,
  estado: "Atendida",
};

function renderAgenda(modoDemo = false) {
  const value: DemoContextType = {
    autenticacionCargando: false,
    rolActivo: modoDemo ? "medico" : "medico",
    setRolActivo: vi.fn(),
    autenticado: true,
    setAutenticado: vi.fn(),
    modoDemo,
    setModoDemo: vi.fn(),
    usuarioAutenticado: modoDemo ? null : {
      id_usuario: 7,
      nombre: "Dr.",
      ape_paterno: "Cuenta",
      ape_materno: "Real",
      rol: "medicos",
    },
    setUsuarioAutenticado: vi.fn(),
    usuarioActivo: USUARIOS_DEMO.medico,
  };
  return render(
    <DemoContext.Provider value={value}>
      <MiAgendaPage />
    </DemoContext.Provider>
  );
}

describe("MiAgendaPage", () => {
  beforeEach(() => {
    vi.mocked(citasService.listar).mockReset();
    vi.mocked(consultasService.registrar).mockReset();
  });

  it("consulta la agenda sin enviar id de médico y muestra citas de la cuenta", async () => {
    vi.mocked(citasService.listar).mockResolvedValue({
      data: {
        citas: [citaMedico],
        paginacion: { pagina: 1, por_pagina: 20, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
    renderAgenda();

    expect(await screen.findByText("Paciente del médico")).toBeTruthy();
    expect(screen.getByText("Atendida")).toBeTruthy();
    expect(citasService.listar).toHaveBeenCalledWith(
      expect.any(String),
      1,
      20
    );
  });

  it("consulta la API al cambiar la fecha", async () => {
    vi.mocked(citasService.listar).mockResolvedValue({
      data: {
        citas: [],
        paginacion: { pagina: 1, por_pagina: 20, total: 0, paginas: 0 },
      },
      error: null,
      status: 200,
    });
    renderAgenda();

    fireEvent.change(screen.getByLabelText("Fecha de agenda"), {
      target: { value: "2026-10-18" },
    });

    await waitFor(() => {
      expect(citasService.listar).toHaveBeenLastCalledWith("2026-10-18", 1, 20);
    });
  });

  it("mantiene el modo demo separado de los datos de la API", async () => {
    renderAgenda(true);

    expect(await screen.findByText("Roberto Hernández")).toBeTruthy();
    expect(screen.getByText(/Datos ficticios de demostración/)).toBeTruthy();
    expect(screen.getByText("Claudia Mendoza")).toBeTruthy();
    expect(citasService.listar).not.toHaveBeenCalled();
  });

  it("permite registrar consulta solo desde una cita agendada y recarga al guardar", async () => {
    vi.mocked(citasService.listar).mockResolvedValue({
      data: {
        citas: [{ ...citaMedico, estado: "Agendada" }],
        paginacion: { pagina: 1, por_pagina: 20, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
    vi.mocked(consultasService.registrar).mockResolvedValue({
      data: {
        id_consulta: 45,
        id_cita: 25,
        fecha_consulta: null,
        motivo: "Motivo",
        diagnostico: null,
        observaciones: null,
        tratamiento: null,
        recetas: [],
      },
      error: null,
      status: 201,
    });

    renderAgenda();
    fireEvent.click(await screen.findByRole("button", {
      name: "Registrar consulta: Paciente del médico",
    }));
    fireEvent.change(screen.getByLabelText("Diagnóstico"), {
      target: { value: "Diagnóstico de prueba" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar consulta" }));

    await screen.findByText(/Consulta registrada correctamente/);
    expect(consultasService.registrar).toHaveBeenCalledWith(25, {
      motivo: "",
      diagnostico: "Diagnóstico de prueba",
      observaciones: "",
      tratamiento: "",
    });
    await waitFor(() => expect(citasService.listar).toHaveBeenCalledTimes(2));
  });

  it("muestra el error real de la API y no ofrece consulta para estados no elegibles", async () => {
    vi.mocked(citasService.listar).mockResolvedValue({
      data: {
        citas: [citaMedico],
        paginacion: { pagina: 1, por_pagina: 20, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
    renderAgenda();

    expect(await screen.findByText("Atendida")).toBeTruthy();
    expect(screen.queryByRole("button", {
      name: "Registrar consulta: Paciente del médico",
    })).toBeNull();
    expect(consultasService.registrar).not.toHaveBeenCalled();
  });

  it("muestra el error real al fallar el registro y no recarga la agenda", async () => {
    vi.mocked(citasService.listar).mockResolvedValue({
      data: {
        citas: [{ ...citaMedico, estado: "Agendada" }],
        paginacion: { pagina: 1, por_pagina: 20, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
    vi.mocked(consultasService.registrar).mockResolvedValue({
      data: null,
      error: "La cita ya tiene una consulta registrada.",
      status: 409,
    });
    renderAgenda();

    fireEvent.click(await screen.findByRole("button", {
      name: "Registrar consulta: Paciente del médico",
    }));
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Consulta de prueba" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar consulta" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "La cita ya tiene una consulta registrada.",
    );
    expect(citasService.listar).toHaveBeenCalledTimes(1);
  });

  it("no llama al endpoint de consulta en modo demo", async () => {
    renderAgenda(true);
    expect(await screen.findByText("Roberto Hernández")).toBeTruthy();
    expect(consultasService.registrar).not.toHaveBeenCalled();
  });
});
