import { CheckCircle, Info, X } from "lucide-react";

interface ToastDemoProps {
  mensaje: string;
  tipo?: "exito" | "info" | "advertencia";
  onCerrar?: () => void;
}

const estilos = {
  exito:      "bg-brand-100 border-brand-500 text-brand-800",
  info:       "bg-blue-50 border-blue-400 text-blue-800",
  advertencia:"bg-amber-50 border-amber-400 text-amber-800",
};

const Iconos = {
  exito:       CheckCircle,
  info:        Info,
  advertencia: Info,
};

export function ToastDemo({ mensaje, tipo = "exito", onCerrar }: ToastDemoProps) {
  const Icono = Iconos[tipo];
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-md text-sm ${estilos[tipo]}`}
      role="status"
      aria-live="polite"
    >
      <Icono size={16} aria-hidden="true" />
      <span className="flex-1">{mensaje}</span>
      {onCerrar && (
        <button
          onClick={onCerrar}
          className="hover:opacity-70 focus-visible:outline-none"
          aria-label="Cerrar notificación"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
