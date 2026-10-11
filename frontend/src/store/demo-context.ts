import { createContext, useContext } from "react";
import type { DemoContextType, Rol, UsuarioDemo } from "../types";

export const USUARIOS_DEMO: Record<Rol, UsuarioDemo> = {
  administrador: {
    id: 1,
    nombre: "Ana García",
    rol: "administrador",
    clinica: "ClinicTec Central",
    avatar: "AG",
  },
  recepcion: {
    id: 2,
    nombre: "Carlos Méndez",
    rol: "recepcion",
    clinica: "ClinicTec Norte",
    avatar: "CM",
  },
  medico: {
    id: 3,
    nombre: "Dra. Laura Vega",
    rol: "medico",
    clinica: "ClinicTec Norte",
    avatar: "LV",
  },
};

export const DemoContext = createContext<DemoContextType | null>(null);

export function useDemo(): DemoContextType {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo debe usarse dentro de DemoProvider");
  return ctx;
}
