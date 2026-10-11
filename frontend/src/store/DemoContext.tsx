import { useState, type ReactNode } from "react";
import type { Rol } from "../types";
import { DemoContext, USUARIOS_DEMO } from "./demo-context";

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
