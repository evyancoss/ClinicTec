import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  abierto:    boolean;
  titulo:     string;
  onCerrar:   () => void;
  children:   ReactNode;
  ancho?:     string;
}

export function Modal({ abierto, titulo, onCerrar, children, ancho = "max-w-lg" }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${ancho} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-200">
          <h2 id="modal-titulo" className="text-lg font-semibold text-brand-800">
            {titulo}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-brand-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
