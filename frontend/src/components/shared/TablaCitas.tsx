import { useState } from "react";
import { CheckCircle2, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import type { Cita } from "../../types";
import { BadgeEstado } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ToastDemo } from "../ui/ToastDemo";
import { EstadoVacio } from "../ui/EstadoVacio";

interface TablaCitasProps {
  citas: Cita[];
  modoRecepcion?: boolean;
}

export function TablaCitas({ citas, modoRecepcion = false }: TablaCitasProps) {
  const [toast, setToast] = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="relative">
      {/* Toast de demostración */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <ToastDemo
            mensaje={toast}
            tipo="info"
            onCerrar={() => setToast(null)}
          />
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-brand-200">
        {citas.length === 0 ? (
          <EstadoVacio
            titulo="Sin citas"
            descripcion="No hay citas que coincidan con los filtros seleccionados."
          />
        ) : (
        <table className="w-full text-sm" aria-label="Lista de citas">
          <thead>
            <tr className="bg-brand-100 text-brand-800">
              <th className="text-left px-4 py-3 font-semibold">Hora</th>
              <th className="text-left px-4 py-3 font-semibold">Paciente</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                Médico
              </th>
              <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">
                Motivo
              </th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              {modoRecepcion && (
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {citas.map((cita, i) => (
              <tr
                key={cita.id}
                className={`border-t border-brand-200 hover:bg-brand-100 transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-brand-50"
                }`}
              >
                <td className="px-4 py-3 font-medium text-brand-800 whitespace-nowrap">
                  {cita.hora}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {cita.paciente}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                  {cita.medico}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell max-w-xs truncate">
                  {cita.motivo}
                </td>
                <td className="px-4 py-3">
                  <BadgeEstado estado={cita.estado} />
                </td>
                {modoRecepcion && (
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      {cita.estado === "programada" && (
                        <>
                          <Button
                            variante="ghost"
                            tamaño="sm"
                            icono={<CheckCircle2 size={14} />}
                            onClick={() =>
                              mostrarToast(
                                "DEMO: En producción, esta acción marcaría la cita como atendida."
                              )
                            }
                            title="Marcar como atendida"
                            aria-label={`Marcar como atendida: ${cita.paciente}`}
                          />
                          <Button
                            variante="ghost"
                            tamaño="sm"
                            icono={<RefreshCw size={14} />}
                            onClick={() =>
                              mostrarToast(
                                "DEMO: En producción, esta acción abriría el formulario de reagendado."
                              )
                            }
                            title="Reagendar"
                            aria-label={`Reagendar cita: ${cita.paciente}`}
                          />
                          <Button
                            variante="ghost"
                            tamaño="sm"
                            icono={<XCircle size={14} className="text-red-500" />}
                            onClick={() =>
                              mostrarToast(
                                "DEMO: En producción, esta acción cancelaría la cita."
                              )
                            }
                            title="Cancelar"
                            aria-label={`Cancelar cita: ${cita.paciente}`}
                          />
                        </>
                      )}
                      {cita.estado !== "programada" && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Sin acciones
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
