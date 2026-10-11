import type { ReactNode } from "react";
import { InboxIcon } from "lucide-react";

interface EstadoVacioProps {
  titulo?: string;
  descripcion?: string;
  icono?: ReactNode;
  accion?: ReactNode;
}

export function EstadoVacio({
  titulo = "Sin resultados",
  descripcion = "No hay elementos para mostrar.",
  icono,
  accion,
}: EstadoVacioProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-brand-200">
        {icono || <InboxIcon size={48} strokeWidth={1} />}
      </div>
      <h3 className="text-base font-semibold text-brand-800 mb-1">{titulo}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{descripcion}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}
