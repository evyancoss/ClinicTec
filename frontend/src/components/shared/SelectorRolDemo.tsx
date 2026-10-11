import type { Rol } from "../../types";

interface SelectorRolDemoProps {
  rolActivo: Rol;
  onChange: (rol: Rol) => void;
}

const roles: { valor: Rol; etiqueta: string }[] = [
  { valor: "recepcion",     etiqueta: "Recepción" },
  { valor: "medico",        etiqueta: "Médico" },
  { valor: "administrador", etiqueta: "Administrador" },
];

export function SelectorRolDemo({ rolActivo, onChange }: SelectorRolDemoProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-amber-700 font-medium hidden sm:inline">
        Ver como:
      </span>
      <div className="flex gap-1">
        {roles.map(({ valor, etiqueta }) => (
          <button
            key={valor}
            onClick={() => onChange(valor)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              rolActivo === valor
                ? "bg-brand-500 text-white"
                : "bg-white text-amber-800 border border-amber-300 hover:bg-amber-100"
            }`}
            aria-pressed={rolActivo === valor}
          >
            {etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
