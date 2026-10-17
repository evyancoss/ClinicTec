import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TablaCitas } from "./TablaCitas";
import type { Cita, EstadoCita } from "../../types";

const estados: EstadoCita[] = [
  "Agendada",
  "Atendida",
  "Cancelada",
  "Reagendada",
];

const citas: Cita[] = estados.map((estado, index) => ({
  id_cita: index + 1,
  id_paciente: index + 1,
  nombre_paciente: `Paciente ${index + 1}`,
  id_medico: 1,
  nombre_medico: "Médico de prueba",
  id_clinica: 1,
  fecha: "2026-10-17",
  hora: `09:0${index}`,
  motivo: null,
  estado,
}));

describe("TablaCitas", () => {
  it("presenta los estados canónicos sin cambiar sus etiquetas", () => {
    render(<TablaCitas citas={citas} />);

    for (const estado of estados) {
      expect(screen.getByText(estado)).toBeTruthy();
    }
  });

  it("mantiene deshabilitadas las acciones pendientes y explica su disponibilidad", () => {
    render(<TablaCitas citas={[citas[0]]} modoRecepcion />);

    expect(screen.getByText(/Alta y cambio a atendida siguen pendientes/)).toBeTruthy();
    for (const accion of [
      "Marcar como atendida: Paciente 1",
      "Reagendar cita: Paciente 1",
      "Cancelar cita: Paciente 1",
    ]) {
      expect(screen.getByRole("button", { name: accion }).hasAttribute("disabled")).toBe(true);
    }
  });

  it("habilita cancelación y reprogramación solo con sus manejadores reales", () => {
    render(<TablaCitas citas={[citas[0]]} modoRecepcion onCancelarCita={() => undefined} />);

    expect(
      screen.getByRole("button", { name: "Cancelar cita: Paciente 1" }).hasAttribute("disabled"),
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: "Reagendar cita: Paciente 1" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("habilita reprogramación únicamente para citas agendadas con manejador real", () => {
    render(
      <TablaCitas
        citas={[citas[0], citas[1]]}
        modoRecepcion
        onReprogramarCita={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reagendar cita: Paciente 1" }).hasAttribute("disabled"),
    ).toBe(false);
    expect(screen.queryByRole("button", {
      name: "Reagendar cita: Paciente 2",
    })).toBeNull();
  });

  it("muestra acción médica solo para citas agendadas y con manejador", () => {
    render(
      <TablaCitas
        citas={[citas[0], citas[1]]}
        modoMedico
        onRegistrarConsulta={() => undefined}
      />,
    );

    expect(screen.getByRole("button", {
      name: "Registrar consulta: Paciente 1",
    }).hasAttribute("disabled")).toBe(false);
    expect(screen.queryByRole("button", {
      name: "Registrar consulta: Paciente 2",
    })).toBeNull();
  });
});
