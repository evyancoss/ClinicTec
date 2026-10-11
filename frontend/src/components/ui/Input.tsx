import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconoIzquierdo?: ReactNode;
  iconoDerecho?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  iconoIzquierdo,
  iconoDerecho,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-brand-800"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {iconoIzquierdo && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconoIzquierdo}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-md border px-3 py-2 text-sm text-gray-800
            placeholder:text-gray-400 bg-white
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            disabled:opacity-50 disabled:bg-gray-50
            ${error ? "border-red-400 focus:ring-red-400" : "border-brand-200"}
            ${iconoIzquierdo ? "pl-9" : ""}
            ${iconoDerecho ? "pr-9" : ""}
            ${className}
          `}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          aria-invalid={!!error}
          {...props}
        />
        {iconoDerecho && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconoDerecho}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, children, id, className = "", ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-brand-800">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-gray-800
          bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
          disabled:opacity-50
          ${error ? "border-red-400" : ""}
          ${className}
        `}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
