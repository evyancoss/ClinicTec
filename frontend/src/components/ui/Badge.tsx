import type { EstadoCita } from "../../types";

// ─── Badge de estado de cita ─────────────────────────────────────────────────
const estilosEstado: Record<EstadoCita, string> = {
  Agendada:   "bg-brand-100 text-brand-800",
  Atendida:   "bg-brand-500 text-white",
  Cancelada:  "bg-red-100 text-red-700",
  Reagendada: "bg-amber-100 text-amber-800",
};

const etiquetasEstado: Record<EstadoCita, string> = {
  Agendada:   "Agendada",
  Atendida:   "Atendida",
  Cancelada:  "Cancelada",
  Reagendada: "Reagendada",
};

interface BadgeEstadoProps {
  estado: EstadoCita;
}

export function BadgeEstado({ estado }: BadgeEstadoProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estilosEstado[estado]}`}
    >
      {etiquetasEstado[estado]}
    </span>
  );
}

// ─── Badge genérico ───────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variante?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const estilosVariante: Record<NonNullable<BadgeProps["variante"]>, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-brand-100 text-brand-800",
  warning: "bg-amber-100 text-amber-800",
  danger:  "bg-red-100 text-red-700",
  info:    "bg-blue-100 text-blue-700",
};

export function Badge({ children, variante = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estilosVariante[variante]} ${className}`}
    >
      {children}
    </span>
  );
}
