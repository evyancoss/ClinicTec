import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MisPacientesPage } from "./MisPacientesPage";
import { DemoContext, USUARIOS_DEMO } from "../../store/demo-context";
import type { DemoContextType } from "../../types";
import { pacientesService } from "../../lib/pacientesService";
import { consultasService } from "../../lib/consultasService";
import type { HistorialPacienteAPI } from "../../lib/pacientesService";
import type { ConsultaAPI } from "../../lib/consultasService";

vi.mock("../../lib/pacientesService", () => ({
  pacientesService: {
    listar: vi.fn(),
    obtener: vi.fn(),
    crear: vi.fn(),
    editar: vi.fn(),
    historial: vi.fn(),
  },
}));

vi.mock("../../lib/consultasService", () => ({
  consultasService: {
    registrar: vi.fn(),
    emitirReceta: vi.fn(),
  },
}));

const paciente = {
  id_paciente: 12,
  nombre: "Elena",
  ape_paterno: "Prueba",
  ape_materno: "Paciente",
  fecha_nacimiento: "1990-01-01",
  sexo: "F",
  telefono: null,
  correo: null,
};

function historial(recetas: ConsultaAPI["recetas"] = []): HistorialPacienteAPI {
  return {
    paciente,
    citas: [{
      id_cita: 25,
      fecha: "2026-10-17",
      hora: "10:00",
      estado: "Atendida",
      motivo: "Seguimiento",
      consulta: {
        id_consulta: 45,
        id_cita: 25,
        fecha_consulta: "2026-10-17T10:00:00",
        motivo: "Dolor",
        diagnostico: "Migraña",
        observaciones: null,
        tratamiento: "Reposo",
        recetas,
      },
    }],
  };
}

function renderPacientes(modoDemo = false) {
  const value: DemoContextType = {
    autenticacionCargando: false,
    rolActivo: "medico",
    setRolActivo: vi.fn(),
    autenticado: true,
    setAutenticado: vi.fn(),
    modoDemo,
    setModoDemo: vi.fn(),
    usuarioAutenticado: modoDemo ? null : {
      id_usuario: 7,
      nombre: "Dra.",
      ape_paterno: "Cuenta",
      ape_materno: "Real",
      rol: "medicos",
    },
    setUsuarioAutenticado: vi.fn(),
    usuarioActivo: USUARIOS_DEMO.medico,
  };
  return render(
    <DemoContext.Provider value={value}>
      <MisPacientesPage />
    </DemoContext.Provider>,
  );
}

describe("MisPacientesPage", () => {
  beforeEach(() => {
    vi.mocked(pacientesService.listar).mockReset();
    vi.mocked(pacientesService.historial).mockReset();
    vi.mocked(consultasService.emitirReceta).mockReset();
    vi.mocked(pacientesService.listar).mockResolvedValue({
      data: {
        pacientes: [paciente],
        paginacion: { pagina: 1, por_pagina: 20, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
  });

  it("carga el historial autorizado y permite emitir una receta con detalles", async () => {
    const receta = {
      id_receta: 91,
      id_consulta: 45,
      fecha_receta: "2026-10-17T11:00:00",
      indicaciones: null,
      detalles: [{
        id_detalle: 18,
        id_receta: 91,
        medicamento: "Medicamento",
        dosis: "1 tableta",
        frecuencia: null,
        duracion: null,
        indicaciones: null,
      }],
    };
    vi.mocked(pacientesService.historial).mockResolvedValueOnce({
      data: historial(),
      error: null,
      status: 200,
    }).mockResolvedValueOnce({
      data: historial([receta]),
      error: null,
      status: 200,
    });
    vi.mocked(consultasService.emitirReceta).mockResolvedValue({
      data: receta,
      error: null,
      status: 201,
    });

    renderPacientes();
    fireEvent.click(await screen.findByRole("button", { name: /Elena Prueba/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver historial" }));
    expect(await screen.findByText("Migraña")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Emitir receta" }));
    fireEvent.change(screen.getByLabelText("Medicamento"), {
      target: { value: "Medicamento" },
    });
    fireEvent.change(screen.getByLabelText("Dosis"), {
      target: { value: "1 tableta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    expect(await screen.findByText("Receta emitida correctamente.")).toBeTruthy();
    expect(consultasService.emitirReceta).toHaveBeenCalledWith(45, {
      indicaciones: "",
      detalles: [{
        medicamento: "Medicamento",
        dosis: "1 tableta",
        frecuencia: "",
        duracion: "",
        indicaciones: "",
      }],
    });
    await waitFor(() => expect(pacientesService.historial).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Medicamento\s+— 1 tableta/)).toBeTruthy();
  });

  it("muestra errores del historial y mantiene demo sin solicitudes reales", async () => {
    vi.mocked(pacientesService.historial).mockResolvedValue({
      data: null,
      error: "No autorizado",
      status: 403,
    });
    renderPacientes();
    fireEvent.click(await screen.findByRole("button", { name: /Elena Prueba/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver historial" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No autorizado");

    vi.mocked(pacientesService.listar).mockClear();
    vi.mocked(pacientesService.historial).mockClear();
    renderPacientes(true);
    expect(await screen.findByText(/Modo demo/)).toBeTruthy();
    expect(pacientesService.listar).not.toHaveBeenCalled();
    expect(pacientesService.historial).not.toHaveBeenCalled();
    expect(consultasService.emitirReceta).not.toHaveBeenCalled();
  });

  it("muestra el error real de la API cuando falla la emisión de receta", async () => {
    vi.mocked(pacientesService.historial).mockResolvedValue({
      data: historial(),
      error: null,
      status: 200,
    });
    vi.mocked(consultasService.emitirReceta).mockResolvedValue({
      data: null,
      error: "No se pudo emitir la receta.",
      status: 500,
    });
    renderPacientes();
    fireEvent.click(await screen.findByRole("button", { name: /Elena Prueba/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver historial" }));
    fireEvent.click(await screen.findByRole("button", { name: "Emitir receta" }));
    fireEvent.change(screen.getByLabelText("Medicamento"), {
      target: { value: "Medicamento" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar receta" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No se pudo emitir la receta.",
    );
    expect(pacientesService.historial).toHaveBeenCalledTimes(1);
  });
});
