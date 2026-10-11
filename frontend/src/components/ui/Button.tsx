import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primary" | "secondary" | "danger" | "ghost";
type Tamaño = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamaño?: Tamaño;
  icono?: ReactNode;
  iconoDerecho?: ReactNode;
  cargando?: boolean;
  children?: ReactNode;
}

const estilosBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const estilosVariante: Record<Variante, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-800 active:bg-brand-800",
  secondary:
    "border border-brand-200 text-brand-800 bg-transparent hover:bg-brand-100 active:bg-brand-100",
  danger:
    "bg-red-500 text-white hover:bg-red-700 active:bg-red-800",
  ghost:
    "bg-transparent text-brand-800 hover:bg-brand-100 active:bg-brand-100",
};

const estilosTamaño: Record<Tamaño, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

export function Button({
  variante = "primary",
  tamaño = "md",
  icono,
  iconoDerecho,
  cargando = false,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${estilosBase} ${estilosVariante[variante]} ${estilosTamaño[tamaño]} ${className}`}
      disabled={cargando || props.disabled}
      {...props}
    >
      {cargando ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icono
      )}
      {children}
      {!cargando && iconoDerecho}
    </button>
  );
}
