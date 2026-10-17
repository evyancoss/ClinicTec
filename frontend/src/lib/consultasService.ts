import { api } from "./api";

export interface DatosConsulta {
  motivo?: string;
  diagnostico?: string;
  observaciones?: string;
  tratamiento?: string;
}

export interface DetalleRecetaAPI {
  id_detalle: number;
  id_receta: number;
  medicamento: string;
  dosis: string | null;
  frecuencia: string | null;
  duracion: string | null;
  indicaciones: string | null;
}

export interface RecetaAPI {
  id_receta: number;
  id_consulta: number;
  fecha_receta: string | null;
  indicaciones: string | null;
  detalles: DetalleRecetaAPI[];
}

export interface ConsultaAPI {
  id_consulta: number;
  id_cita: number;
  fecha_consulta: string | null;
  motivo: string | null;
  diagnostico: string | null;
  observaciones: string | null;
  tratamiento: string | null;
  recetas: RecetaAPI[];
}

export interface DatosReceta {
  indicaciones?: string;
  detalles: Array<{
    medicamento: string;
    dosis?: string;
    frecuencia?: string;
    duracion?: string;
    indicaciones?: string;
  }>;
}

export const consultasService = {
  registrar: (idCita: number, datos: DatosConsulta) =>
    api.post<ConsultaAPI>(`/api/citas/${idCita}/consulta`, datos),

  emitirReceta: (idConsulta: number, datos: DatosReceta) =>
    api.post<RecetaAPI>(`/api/consultas/${idConsulta}/recetas`, datos),
};
