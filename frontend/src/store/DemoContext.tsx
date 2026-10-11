import { createContext, useContext, useState, type ReactNode } from "react";
import type { Rol, DemoContextType, UsuarioDemo } from "../types";

// ─── Usuarios de demostración por rol ────────────────────────────────────────
const USUARIOS_DEMO: Record<Rol, UsuarioDemo> = {
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

// ─── Contexto ─────────────────────────────────────────────────────────────────
const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [rolActivo, setRolActivo] = useState<Rol>("recepcion");
  const [autenticado, setAutenticado] = useState(false);

  return (
    <DemoContext.Provider
      value={{
        rolActivo,
        setRolActivo,
        autenticado,
        setAutenticado,
        usuarioActivo: USUARIOS_DEMO[rolActivo],
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

// ─── Hook de acceso ───────────────────────────────────────────────────────────
export function useDemo(): DemoContextType {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo debe usarse dentro de DemoProvider");
  return ctx;
}
