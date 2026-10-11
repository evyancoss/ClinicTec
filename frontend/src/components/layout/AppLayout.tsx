import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useDemo } from "../../store/demo-context";
import { SelectorRolDemo } from "../shared/SelectorRolDemo";
import type { Rol } from "../../types";

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

// Ruta de inicio por rol
const rutaInicio: Record<Rol, string> = {
  recepcion:     "/recepcion/agenda",
  medico:        "/medico/agenda",
  administrador: "/admin/dashboard",
};

export function AppLayout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const { rolActivo, setRolActivo, usuarioActivo } = useDemo();
  const location = useLocation();
  const navigate = useNavigate();

  const titulo = titulos[location.pathname] || "ClinicTec";

  // Al cambiar rol, redirige al inicio del módulo correspondiente
  function cambiarRol(nuevoRol: Rol) {
    setRolActivo(nuevoRol);
    navigate(rutaInicio[nuevoRol]);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-50">
      {/* Sidebar */}
      <Sidebar
        rol={rolActivo}
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
      />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          titulo={titulo}
          usuario={usuarioActivo}
          onAbrirMenu={() => setSidebarAbierto(true)}
        />

        {/* Banner de demostración + selector de rol */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-amber-700 font-medium">
            ⚠️ Modo demostración — Ninguna acción modifica datos reales
          </p>
          <SelectorRolDemo rolActivo={rolActivo} onChange={cambiarRol} />
        </div>

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
