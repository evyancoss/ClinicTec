import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Users,
  UserCog,
  LayoutDashboard,
  Stethoscope,
  Building2,
  ClipboardList,
  X,
} from "lucide-react";
import type { Rol } from "../../types";

// ─── Ítems de navegación por rol ─────────────────────────────────────────────
const navItems: Record<Rol, { ruta: string; etiqueta: string; Icono: React.ElementType }[]> = {
  recepcion: [
    { ruta: "/recepcion/agenda",   etiqueta: "Agenda del día",   Icono: CalendarDays },
    { ruta: "/recepcion/pacientes",etiqueta: "Pacientes",         Icono: Users },
  ],
  medico: [
    { ruta: "/medico/agenda",      etiqueta: "Mi agenda",         Icono: CalendarDays },
    { ruta: "/medico/pacientes",   etiqueta: "Mis pacientes",     Icono: ClipboardList },
  ],
  administrador: [
    { ruta: "/admin/dashboard",    etiqueta: "Dashboard",         Icono: LayoutDashboard },
    { ruta: "/admin/clinicas",     etiqueta: "Clínicas",          Icono: Building2 },
    { ruta: "/admin/usuarios",     etiqueta: "Usuarios",          Icono: UserCog },
    { ruta: "/recepcion/pacientes",etiqueta: "Pacientes",         Icono: Users },
  ],
};

interface SidebarProps {
  rol: Rol;
  abierto: boolean;
  onCerrar: () => void;
}

export function Sidebar({ rol, abierto, onCerrar }: SidebarProps) {
  const items = navItems[rol];

  return (
    <>
      {/* Overlay móvil */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      {/* Panel lateral */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          bg-brand-800 text-white
          transition-transform duration-300
          w-60
          ${abierto ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        aria-label="Navegación principal"
      >
        {/* Logo y nombre */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-500 rounded-lg p-1.5">
              <Stethoscope size={20} aria-hidden="true" />
            </div>
            <span className="text-lg font-bold tracking-tight">ClinicTec</span>
          </div>
          {/* Botón cerrar en móvil */}
          <button
            className="lg:hidden hover:bg-white/10 rounded-md p-1 transition-colors"
            onClick={onCerrar}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Etiqueta de rol */}
        <div className="px-5 py-3">
          <span className="text-xs font-medium uppercase tracking-widest text-white/50">
            {etiquetaRol(rol)}
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 pb-4 space-y-1" aria-label="Menú de secciones">
          {items.map(({ ruta, etiqueta, Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              onClick={onCerrar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-brand-100 text-brand-800 border-l-4 border-brand-500 pl-2"
                    : "text-white hover:bg-white/10"
                }`
              }
            >
              <Icono size={18} aria-hidden="true" />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        {/* Pie del sidebar */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            © 2026 ClinicTec
          </p>
        </div>
      </aside>
    </>
  );
}

function etiquetaRol(rol: Rol): string {
  const etiquetas: Record<Rol, string> = {
    administrador: "Administración",
    recepcion:     "Recepción",
    medico:        "Médico",
  };
  return etiquetas[rol];
}
