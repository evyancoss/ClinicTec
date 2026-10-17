import { useEffect, useState, type ReactNode } from "react";
import { setAccessToken, setUnauthorizedHandler } from "../lib/api";
import { authService } from "../lib/authService";
import { rolVisualDeCuenta, type Rol } from "../types";
import { DemoContext } from "./demo-context";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [autenticacionCargando, setAutenticacionCargando] = useState(true);
  const [rolActivo, setRolActivo] = useState<Rol>("recepcion");
  const [autenticado, setAutenticado] = useState(false);
  const [modoDemo, setModoDemo] = useState(false);
  const [usuarioAutenticado, setUsuarioAutenticado] = useState<import("../types").PerfilAutenticado | null>(null);

  useEffect(() => {
    let vigente = true;

    void authService.restaurarSesion()
      .then((perfil) => {
        if (!vigente || !perfil) return;
        const rol = rolVisualDeCuenta(perfil.rol);
        if (!rol) {
          setAccessToken(null);
          return;
        }
        setUsuarioAutenticado(perfil);
        setRolActivo(rol);
        setModoDemo(false);
        setAutenticado(true);
      })
      .catch(() => {
        if (!vigente) return;
        setAccessToken(null);
        setUsuarioAutenticado(null);
        setModoDemo(false);
        setAutenticado(false);
      })
      .finally(() => {
        if (vigente) setAutenticacionCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUsuarioAutenticado(null);
      setModoDemo(false);
      setAutenticado(false);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        autenticacionCargando,
        rolActivo,
        setRolActivo,
        autenticado,
        setAutenticado,
        modoDemo,
        setModoDemo: () => setModoDemo(false),
        usuarioAutenticado,
        setUsuarioAutenticado,
        usuarioActivo: {
          id: usuarioAutenticado?.id_usuario ?? 0,
          nombre: usuarioAutenticado
            ? `${usuarioAutenticado.nombre} ${usuarioAutenticado.ape_paterno} ${usuarioAutenticado.ape_materno}`.trim()
            : "",
          rol: usuarioAutenticado
            ? rolVisualDeCuenta(usuarioAutenticado.rol) ?? rolActivo
            : rolActivo,
          clinica: "",
          avatar: usuarioAutenticado
            ? `${usuarioAutenticado.nombre[0] ?? ""}${usuarioAutenticado.ape_paterno[0] ?? ""}`.toUpperCase()
            : "",
        },
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
