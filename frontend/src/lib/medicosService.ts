/**
 * lib/medicosService.ts
 * Servicios de la API de médicos para ClinicTec.
 */

import { api } from "./api";

export interface MedicoAPI {
  id_medico:          number;
  id_usuario:         number | null;
  id_clinica:         number;
  nombre:             string;
  ape_paterno:        string;
  ape_materno:        string;
  especialidad:       string;
  cedula_profesional: string;
  telefono:           string | null;
  correo:             string | null;
  estado:             boolean;
}

export const medicosService = {
  listar: () =>
    api.get<MedicoAPI[]>("/api/medicos/"),

  obtener: (id: number) =>
    api.get<MedicoAPI>(`/api/medicos/${id}`),

  miPerfil: () =>
    api.get<MedicoAPI>("/api/medicos/yo"),
};
