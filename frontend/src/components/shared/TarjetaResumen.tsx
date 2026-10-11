import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TarjetaResumenProps {
  titulo: string;
  valor: string | number;
  descripcion?: string;
  tendencia?: "subida" | "bajada" | "neutro";
  icono?: ReactNode;
  colorIcono?: string;
}

const iconosTendencia = {
  subida: TrendingUp,
  bajada: TrendingDown,
  neutro: Minus,
};

const colorTendencia = {
  subida: "text-green-600",
  bajada: "text-red-500",
  neutro: "text-gray-400",
};

export function TarjetaResumen({
  titulo,
  valor,
  descripcion,
  tendencia,
  icono,
  colorIcono = "bg-brand-100 text-brand-500",
}: TarjetaResumenProps) {
  const IconoTendencia = tendencia ? iconosTendencia[tendencia] : null;

  return (
    <div className="bg-white border border-brand-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{titulo}</p>
          <p className="mt-1.5 text-2xl font-bold text-brand-800">{valor}</p>
          {descripcion && (
            <p className="mt-1 text-xs text-gray-500">{descripcion}</p>
          )}
        </div>
        {icono && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorIcono}`}
          >
            {icono}
          </div>
        )}
      </div>

      {tendencia && IconoTendencia && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${colorTendencia[tendencia]}`}>
          <IconoTendencia size={13} aria-hidden="true" />
          <span>
            {tendencia === "subida"
              ? "Incremento respecto al período anterior"
              : tendencia === "bajada"
              ? "Descenso respecto al período anterior"
              : "Sin cambio significativo"}
          </span>
        </div>
      )}
    </div>
  );
}
