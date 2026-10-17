import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgendaPage } from "./AgendaPage";
import { DemoContext, USUARIOS_DEMO } from "../../store/demo-context";
import type { DemoContextType } from "../../types";
import { citasService } from "../../lib/citasService";
import { medicosService } from "../../lib/medicosService";
import { pacientesService } from "../../lib/pacientesService";
import type { ListaCitasResponse } from "../../lib/citasService";
import type { Cita } from "../../types";

vi.mock("../../lib/citasService", () => ({
  citasService: {
    listar: vi.fn(),
    obtener: vi.fn(),
    cancelar: vi.fn(),
    crear: vi.fn(),
    reprogramar: vi.fn(),
  },
}));

vi.mock("../../lib/medicosService", () => ({
  medicosService: { listar: vi.fn() },
}));

vi.mock("../../lib/pacientesService", () => ({
  pacientesService: { listar: vi.fn() },
}));

const cita: Cita = {
  id_cita: 20,
  id_paciente: 4,
  nombre_paciente: "Paciente API",
  id_medico: 8,
  nombre_medico: "Médica API",
  id_clinica: 3,
  fecha: "2026-10-17",
  hora: "09:15",
  motivo: "Motivo API",
  estado: "Agendada",
};

function respuesta(
  citas: Cita[],
  pagina = 1,
  paginas = 1,
): { data: ListaCitasResponse; error: null; status: number } {
  return {
    data: {
      citas,
      paginacion: {
        pagina,
        por_pagina: 20,
        total: citas.length,
        paginas,
      },
    },
    error: null,
    status: 200,
  };
}

function contexto(modoDemo: boolean): DemoContextType {
  return {
    autenticacionCargando: false,
    rolActivo: "recepcion",
    setRolActivo: vi.fn(),
    autenticado: true,
    setAutenticado: vi.fn(),
    modoDemo,
    setModoDemo: vi.fn(),
    usuarioAutenticado: modoDemo ? null : {
      id_usuario: 4,
      nombre: "Recepción",
      ape_paterno: "Prueba",
      ape_materno: "API",
      rol: "recepcion",
    },
    setUsuarioAutenticado: vi.fn(),
    usuarioActivo: USUARIOS_DEMO.recepcion,
  };
}

function renderAgenda(modoDemo = false) {
  return render(
    <DemoContext.Provider value={contexto(modoDemo)}>
      <AgendaPage />
    </DemoContext.Provider>
  );
}

describe("AgendaPage de recepción", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.mocked(citasService.listar).mockReset();
    vi.mocked(citasService.cancelar).mockReset();
    vi.mocked(citasService.crear).mockReset();
    vi.mocked(citasService.reprogramar).mockReset();
    vi.mocked(medicosService.listar).mockReset();
    vi.mocked(pacientesService.listar).mockReset();
  });

  it("carga citas reales de la fecha seleccionada y presenta el estado canónico", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([cita]));

    renderAgenda();

    expect(await screen.findByText("Paciente API")).toBeTruthy();
    expect(screen.getAllByText("Médica API").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agendada").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Datos ficticios/)).toBeNull();
    expect(citasService.listar).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      1,
      20
    );
  });

  it("consulta de nuevo al cambiar la fecha", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([]));
    renderAgenda();

    const fecha = screen.getByLabelText("Fecha de agenda");
    fireEvent.change(fecha, { target: { value: "2026-10-18" } });

    await waitFor(() => {
      expect(citasService.listar).toHaveBeenLastCalledWith("2026-10-18", 1, 20);
    });
  });

  it("conserva la búsqueda y los filtros de estado sobre la página cargada", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([cita]));
    renderAgenda();
    expect(await screen.findByText("Paciente API")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), {
      target: { value: "Cancelada" },
    });

    expect(screen.queryByText("Paciente API")).toBeNull();
    expect(screen.getByText("Sin coincidencias")).toBeTruthy();
  });

  it("muestra el estado vacío si no hay resultados", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([]));
    renderAgenda();

    expect(await screen.findByText("Sin citas")).toBeTruthy();
    expect(screen.getByText("No hay citas para la fecha seleccionada.")).toBeTruthy();
  });

  it("muestra el estado de carga mientras espera a la API", async () => {
    let resolver!: (value: ReturnType<typeof respuesta>) => void;
    vi.mocked(citasService.listar).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    renderAgenda();

    expect(screen.getByRole("status").textContent).toContain("Cargando citas");
    resolver(respuesta([cita]));
    expect(await screen.findByText("Paciente API")).toBeTruthy();
  });

  it("muestra el error devuelto por la API", async () => {
    vi.mocked(citasService.listar).mockResolvedValue({
      data: null,
      error: "Acceso denegado por la API.",
      status: 403,
    });
    renderAgenda();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Acceso denegado por la API."
    );
  });

  it("permite avanzar página y consulta los parámetros de paginación", async () => {
    vi.mocked(citasService.listar)
      .mockResolvedValueOnce({
        ...respuesta([cita], 1, 2),
        data: {
          ...respuesta([cita], 1, 2).data,
          paginacion: { pagina: 1, por_pagina: 20, total: 21, paginas: 2 },
        },
      })
      .mockResolvedValueOnce({
        ...respuesta([], 2, 2),
        data: {
          ...respuesta([], 2, 2).data,
          paginacion: { pagina: 2, por_pagina: 20, total: 21, paginas: 2 },
        },
      });
    renderAgenda();

    fireEvent.click(await screen.findByRole("button", { name: "Siguiente" }));

    await waitFor(() => {
      expect(citasService.listar).toHaveBeenLastCalledWith(
        expect.any(String),
        2,
        20
      );
    });
  });

  it("en modo demo muestra solo datos ficticios y no consulta la API", async () => {
    renderAgenda(true);

    expect(await screen.findByText("Roberto Hernández")).toBeTruthy();
    expect(screen.getByText(/Datos ficticios de demostración/)).toBeTruthy();
    expect(citasService.listar).not.toHaveBeenCalled();
    expect(screen.queryByText("Paciente API")).toBeNull();
  });

  it("cancela una cita real con confirmación y vuelve a cargar la agenda", async () => {
    const cancelada = { ...cita, estado: "Cancelada" as const };
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(citasService.listar)
      .mockResolvedValueOnce(respuesta([cita]))
      .mockResolvedValueOnce(respuesta([cancelada]));
    vi.mocked(citasService.cancelar).mockResolvedValue({
      data: cancelada,
      error: null,
      status: 200,
    });
    renderAgenda();

    fireEvent.click(await screen.findByRole("button", {
      name: "Cancelar cita: Paciente API",
    }));

    expect(await screen.findByText("La cita se canceló correctamente.")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole("row", { name: /Paciente API/ }).textContent)
        .toContain("Cancelada");
    });
    expect(citasService.cancelar).toHaveBeenCalledWith(cita.id_cita);
    await waitFor(() => expect(citasService.listar).toHaveBeenCalledTimes(2));
  });

  it("muestra errores de cancelación y no presenta éxito", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([cita]));
    vi.mocked(citasService.cancelar).mockResolvedValue({
      data: null,
      error: "La cita ya no está agendada.",
      status: 409,
    });
    renderAgenda();

    fireEvent.click(await screen.findByRole("button", {
      name: "Cancelar cita: Paciente API",
    }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "La cita ya no está agendada.",
    );
    expect(screen.queryByText("La cita se canceló correctamente.")).toBeNull();
  });

  it("mantiene deshabilitada la cancelación en modo demo", async () => {
    renderAgenda(true);
    const reagendar = await screen.findByRole("button", {
      name: "Reagendar cita: Roberto Hernández",
    });
    const cancelar = await screen.findByRole("button", {
      name: "Cancelar cita: Roberto Hernández",
    });
    expect(cancelar.hasAttribute("disabled")).toBe(true);
    expect(reagendar.hasAttribute("disabled")).toBe(true);
    expect(citasService.cancelar).not.toHaveBeenCalled();
    expect(citasService.reprogramar).not.toHaveBeenCalled();
  });

  it("crea citas solo en modo real y recarga la fecha guardada", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([]));
    vi.mocked(pacientesService.listar).mockResolvedValue({
      data: {
        pacientes: [{
          id_paciente: 4,
          nombre: "Paciente API",
          ape_paterno: "Prueba",
          ape_materno: "",
          fecha_nacimiento: "1990-01-01",
          sexo: "O",
          telefono: null,
          correo: null,
        }],
        paginacion: { pagina: 1, por_pagina: 100, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
    vi.mocked(medicosService.listar).mockResolvedValue({
      data: [{
        id_medico: 8,
        id_clinica: 1,
        nombre_clinica: "Clínica",
        nombre: "Médica",
        ape_paterno: "API",
        ape_materno: "",
        especialidad: "General",
        telefono: null,
        correo: null,
        estado: true,
      }],
      error: null,
      status: 200,
    });
    vi.mocked(citasService.crear).mockResolvedValue({
      data: cita,
      error: null,
      status: 201,
    });
    renderAgenda();

    fireEvent.click(screen.getByRole("button", { name: "Nueva cita" }));
    expect(await screen.findByRole("option", { name: /Paciente API Prueba/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Médica API · General/ })).toBeTruthy();
    expect(screen.getByText(/Duración fija: 60 minutos/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Paciente"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cita" }));

    expect(await screen.findByText("La cita se registró correctamente.")).toBeTruthy();
    expect(citasService.crear).toHaveBeenCalledWith({
      id_paciente: 4,
      id_medico: 8,
      fecha: expect.any(String),
      hora: "10:00",
      motivo: undefined,
    });
    await waitFor(() => expect(citasService.listar).toHaveBeenCalledTimes(2));
  });

  it("muestra fallos de creación y no indica éxito", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([]));
    vi.mocked(pacientesService.listar).mockResolvedValue({
      data: {
        pacientes: [{
          id_paciente: 4,
          nombre: "Paciente API",
          ape_paterno: "Prueba",
          ape_materno: "",
          fecha_nacimiento: "1990-01-01",
          sexo: "O",
          telefono: null,
          correo: null,
        }],
        paginacion: { pagina: 1, por_pagina: 100, total: 1, paginas: 1 },
      },
      error: null,
      status: 200,
    });
    vi.mocked(medicosService.listar).mockResolvedValue({
      data: [{
        id_medico: 8,
        id_clinica: 1,
        nombre_clinica: "Clínica",
        nombre: "Médica",
        ape_paterno: "API",
        ape_materno: "",
        especialidad: "General",
        telefono: null,
        correo: null,
        estado: true,
      }],
      error: null,
      status: 200,
    });
    vi.mocked(citasService.crear).mockResolvedValue({
      data: null,
      error: "El médico ya tiene una cita que se empalma con ese horario.",
      status: 409,
    });
    renderAgenda();

    fireEvent.click(screen.getByRole("button", { name: "Nueva cita" }));
    expect(await screen.findByRole("option", { name: /Paciente API Prueba/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Paciente"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Médico"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cita" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "El médico ya tiene una cita que se empalma",
    );
    expect(screen.queryByText("La cita se registró correctamente.")).toBeNull();
    expect(citasService.crear).toHaveBeenCalled();
  });

  it("no consulta ni crea citas desde el modo demo", async () => {
    renderAgenda(true);
    const nuevaCita = await screen.findByRole("button", {
      name: "Nueva cita (no disponible en demo)",
    });
    expect(nuevaCita.hasAttribute("disabled")).toBe(true);
    expect(citasService.crear).not.toHaveBeenCalled();
    expect(pacientesService.listar).not.toHaveBeenCalled();
    expect(medicosService.listar).not.toHaveBeenCalled();
  });

  it("reprograma una cita Agendada por API y recarga la agenda", async () => {
    const reprogramada = {
      ...cita,
      fecha: "2026-10-20",
      hora: "11:45",
    };
    vi.mocked(citasService.listar)
      .mockResolvedValueOnce(respuesta([cita]))
      .mockResolvedValueOnce(respuesta([reprogramada]));
    vi.mocked(citasService.reprogramar).mockResolvedValue({
      data: reprogramada,
      error: null,
      status: 200,
    });
    renderAgenda();

    fireEvent.click(await screen.findByRole("button", {
      name: "Reagendar cita: Paciente API",
    }));
    expect(screen.getByText(/No quedará guardado el horario anterior/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nueva fecha"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.change(screen.getByLabelText("Nueva hora"), {
      target: { value: "11:45" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar horario" }));

    expect(await screen.findByText(/La cita se reprogramó correctamente/)).toBeTruthy();
    expect(citasService.reprogramar).toHaveBeenCalledWith(20, {
      fecha: "2026-10-20",
      hora: "11:45",
    });
    const filaReprogramada = await screen.findByRole("row", { name: /Paciente API/ });
    expect(filaReprogramada.textContent).toContain("2026-10-20");
    await waitFor(() => expect(citasService.listar).toHaveBeenCalledTimes(2));
  });

  it("muestra el error real de conflicto y mantiene el formulario abierto", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([cita]));
    vi.mocked(citasService.reprogramar).mockResolvedValue({
      data: null,
      error: "El médico ya tiene una cita que se empalma con ese horario.",
      status: 409,
    });
    renderAgenda();

    fireEvent.click(await screen.findByRole("button", {
      name: "Reagendar cita: Paciente API",
    }));
    fireEvent.change(screen.getByLabelText("Nueva fecha"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.change(screen.getByLabelText("Nueva hora"), {
      target: { value: "11:45" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar horario" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "se empalma con ese horario",
    );
    expect(screen.getByRole("button", { name: "Guardar horario" })).toBeTruthy();
    expect(screen.queryByText(/La cita se reprogramó correctamente/)).toBeNull();
    expect(citasService.listar).toHaveBeenCalledTimes(1);
  });

  it("no expone la acción para citas con estado distinto de Agendada", async () => {
    vi.mocked(citasService.listar).mockResolvedValue(respuesta([{
      ...cita,
      estado: "Atendida",
    }]));
    renderAgenda(false);
    expect(await screen.findByText("Paciente API")).toBeTruthy();
    expect(screen.queryByRole("button", {
      name: "Reagendar cita: Paciente API",
    })).toBeNull();
    expect(citasService.reprogramar).not.toHaveBeenCalled();
  });
});
