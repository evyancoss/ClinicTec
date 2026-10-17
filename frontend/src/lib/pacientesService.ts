/**
 * lib/pacientesService.ts
 * Servicios de la API de pacientes para ClinicTec.
 */

import { api } from "./api";
import type { ConsultaAPI } from "./consultasService";

export interface PacienteAPI {
  id_paciente:      number;
  nombre:           string;
  ape_paterno:      string;
  ape_materno:      string;
  fecha_nacimiento: string;
  sexo:             string;
  telefono:         string | null;
  correo:           string | null;
  direccion?:       string | null;
  fecha_registro?:  string | null;
  estado?:          boolean | null;
}

export interface PaginacionAPI {
  pagina:     number;
  por_pagina: number;
  total:      number;
  paginas:    number;
}

export interface ListaPacientesResponse {
  pacientes:  PacienteAPI[];
  paginacion: PaginacionAPI;
}

export interface CitaHistorialAPI {
  id_cita: number;
  fecha: string;
  hora: string;
  estado: string;
  motivo: string | null;
  consulta: ConsultaAPI | null;
}

export interface HistorialPacienteAPI {
  paciente: PacienteAPI;
  citas: CitaHistorialAPI[];
}

export interface NuevoPaciente {
  nombre:           string;
  ape_paterno:      string;
  ape_materno:      string;
  fecha_nacimiento: string;
  sexo:             string;
  telefono?:        string;
  correo?:          string;
  direccion?:       string;
}

export const pacientesService = {
  listar: (pagina = 1, porPagina = 20, busqueda = "") =>
    api.get<ListaPacientesResponse>(
      `/api/pacientes/?pagina=${pagina}&por_pagina=${porPagina}` +
      (busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : "")
    ),

  obtener: (id: number) =>
    api.get<PacienteAPI>(`/api/pacientes/${id}`),

  crear: (datos: NuevoPaciente) =>
    api.post<PacienteAPI>("/api/pacientes/", datos),

  editar: (id: number, datos: Partial<NuevoPaciente>) =>
    api.put<PacienteAPI>(`/api/pacientes/${id}`, datos),

  historial: (id: number) =>
    api.get<HistorialPacienteAPI>(`/api/pacientes/${id}/historial`),
};
