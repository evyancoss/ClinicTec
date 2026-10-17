import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useDemo } from "../../store/demo-context";
import { SelectorRolDemo } from "../shared/SelectorRolDemo";
import { rolVisualDeCuenta, rutaInicioDeRol, type Rol } from "../../types";

// ─── Títulos de cada ruta ─────────────────────────────────────────────────────
const titulos: Record<string, string> = {
  "/recepcion/agenda":    "Agenda del día",
  "/recepcion/pacientes": "Pacientes",
  "/medico/agenda":       "Mi agenda",
  "/medico/pacientes":    "Mis pacientes",
  "/admin/dashboard":     "Dashboard",
  "/admin/clinicas":      "Gestión de clínicas",
  "/admin/usuarios":      "Gestión de usuarios",
};

export function AppLayout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const {
    rolActivo,
    setRolActivo,
    usuarioActivo,
    usuarioAutenticado,
    modoDemo,
  } = useDemo();
  const rolActual = modoDemo
    ? rolActivo
    : usuarioAutenticado
      ? rolVisualDeCuenta(usuarioAutenticado.rol) ?? rolActivo
      : rolActivo;
  const location = useLocation();
  const navigate = useNavigate();

  const titulo = titulos[location.pathname] || "ClinicTec";

  // Al cambiar rol, redirige al inicio del módulo correspondiente
  function cambiarRol(nuevoRol: Rol) {
    if (!modoDemo) return;
    setRolActivo(nuevoRol);
    navigate(rutaInicioDeRol(nuevoRol));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-50">
      {/* Sidebar */}
      <Sidebar
        rol={rolActual}
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
      />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          titulo={titulo}
          usuario={modoDemo || !usuarioAutenticado ? usuarioActivo : usuarioAutenticado}
          modoDemo={modoDemo}
          onAbrirMenu={() => setSidebarAbierto(true)}
        />

        {modoDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ Modo demostración — Ninguna acción modifica datos reales
            </p>
            <SelectorRolDemo rolActivo={rolActivo} onChange={cambiarRol} />
          </div>
        )}

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
