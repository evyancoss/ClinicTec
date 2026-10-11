import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Rol, UsuarioDemo } from "../../types";
import { useDemo } from "../../store/demo-context";

interface HeaderProps {
  titulo: string;
  usuario: UsuarioDemo;
  onAbrirMenu: () => void;
}

const etiquetasRol: Record<Rol, string> = {
  administrador: "Administrador",
  recepcion:     "Recepción",
  medico:        "Médico",
};

export function Header({ titulo, usuario, onAbrirMenu }: HeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { setAutenticado } = useDemo();
  const navigate = useNavigate();

  function cerrarSesion() {
    setMenuAbierto(false);
    setAutenticado(false);
    navigate("/login");
  }

  return (
    <header className="bg-white border-b border-brand-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      {/* Izquierda: botón hamburguesa + título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onAbrirMenu}
          className="lg:hidden p-2 rounded-md text-brand-800 hover:bg-brand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-brand-800 truncate max-w-[200px] sm:max-w-none">{titulo}</h1>
      </div>

      {/* Derecha: información de usuario */}
      <div className="relative">
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="flex items-center gap-2.5 hover:bg-brand-100 rounded-lg px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-haspopup="true"
          aria-expanded={menuAbierto}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold select-none">
            {usuario.avatar}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-medium text-brand-800 leading-tight">
              {usuario.nombre}
            </span>
            <span className="text-xs text-gray-500 leading-tight">
              {etiquetasRol[usuario.rol]}
            </span>
          </div>
          <ChevronDown size={14} className="text-gray-400" aria-hidden="true" />
        </button>

        {/* Dropdown */}
        {menuAbierto && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuAbierto(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 mt-2 w-52 bg-white border border-brand-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-brand-100">
                <p className="text-sm font-medium text-brand-800">{usuario.nombre}</p>
                <p className="text-xs text-gray-500">{usuario.clinica}</p>
                <span className="inline-block mt-1 text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
                  {etiquetasRol[usuario.rol]} — DEMO
                </span>
              </div>
              <button
                onClick={cerrarSesion}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} aria-hidden="true" />
                Cerrar sesión (Demo)
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
