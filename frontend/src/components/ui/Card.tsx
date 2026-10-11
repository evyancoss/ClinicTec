import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div
      className={`bg-white border border-brand-200 rounded-xl shadow-sm ${
        padding ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
}

export function CardHeader({ titulo, subtitulo, accion }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-800">{titulo}</h2>
        {subtitulo && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitulo}</p>
        )}
      </div>
      {accion && <div>{accion}</div>}
    </div>
  );
}
