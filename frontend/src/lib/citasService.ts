import { api } from "./api";
import type { Cita, PaginacionCitas } from "../types";

export interface ListaCitasResponse {
  citas: Cita[];
  paginacion: PaginacionCitas;
}

export interface NuevaCita {
  id_paciente: number;
  id_medico: number;
  fecha: string;
  hora: string;
  motivo?: string;
}

export interface ReprogramacionCita {
  fecha: string;
  hora: string;
}

export const citasService = {
  listar: (fecha: string, pagina = 1, porPagina = 20) => {
    const parametros = new URLSearchParams({
      fecha,
      pagina: String(pagina),
      por_pagina: String(porPagina),
    });
    return api.get<ListaCitasResponse>(`/api/citas?${parametros.toString()}`);
  },

  obtener: (idCita: number) =>
    api.get<Cita>(`/api/citas/${idCita}`),

  cancelar: (idCita: number) =>
    api.post<Cita>(`/api/citas/${idCita}/cancelar`, {}),

  crear: (datos: NuevaCita) =>
    api.post<Cita>("/api/citas", datos),

  reprogramar: (idCita: number, datos: ReprogramacionCita) =>
    api.post<Cita>(`/api/citas/${idCita}/reprogramar`, datos),
};
