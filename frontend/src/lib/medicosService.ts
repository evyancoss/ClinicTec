/**
 * lib/medicosService.ts
 * Servicios de la API de médicos para ClinicTec.
 */

import { api } from "./api";

export interface MedicoAPI {
  id_medico:          number;
  id_clinica:         number;
  nombre_clinica:     string;
  nombre:             string;
  ape_paterno:        string;
  ape_materno:        string;
  especialidad:       string;
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
