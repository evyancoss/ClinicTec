import { CheckCircle2, ClipboardList, RefreshCw, XCircle, Info } from "lucide-react";
import type { Cita } from "../../types";
import { BadgeEstado } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EstadoVacio } from "../ui/EstadoVacio";

interface TablaCitasProps {
  citas: Cita[];
  modoRecepcion?: boolean;
  modoMedico?: boolean;
  onRegistrarConsulta?: (cita: Cita) => void;
  onCancelarCita?: (cita: Cita) => void;
  onReprogramarCita?: (cita: Cita) => void;
  cancelandoId?: number | null;
  reprogramandoId?: number | null;
}

export function TablaCitas({
  citas,
  modoRecepcion = false,
  modoMedico = false,
  onRegistrarConsulta,
  onCancelarCita,
  onReprogramarCita,
  cancelandoId = null,
  reprogramandoId = null,
}: TablaCitasProps) {
  return (
    <div className="relative">
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
              {(modoRecepcion || modoMedico) && (
                <th className={`text-left px-4 py-3 font-semibold ${modoMedico ? "" : "hidden sm:table-cell"}`}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {citas.map((cita, i) => (
              <tr
                key={cita.id_cita}
                className={`border-t border-brand-200 hover:bg-brand-100 transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-brand-50"
                }`}
              >
                <td className="px-4 py-3 font-medium text-brand-800 whitespace-nowrap">
                  <span className="block">{cita.hora}</span>
                  <span className="text-xs text-gray-500">{cita.fecha}</span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {cita.nombre_paciente}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                  {cita.nombre_medico}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell max-w-xs truncate">
                  {cita.motivo || "—"}
                </td>
                <td className="px-4 py-3">
                  <BadgeEstado estado={cita.estado} />
                </td>
                {(modoRecepcion || modoMedico) && (
                  <td className={`px-4 py-3 ${modoMedico ? "" : "hidden sm:table-cell"}`}>
                    <div className="flex items-center gap-1.5">
                      {modoMedico && cita.estado === "Agendada" && (
                        <Button
                          variante="ghost"
                          tamaño="sm"
                          disabled={!onRegistrarConsulta}
                          icono={<ClipboardList size={14} />}
                          title="Registrar consulta"
                          aria-label={`Registrar consulta: ${cita.nombre_paciente}`}
                          onClick={() => onRegistrarConsulta?.(cita)}
                        />
                      )}
                      {modoRecepcion && cita.estado === "Agendada" && (
                        <>
                          <Button
                            variante="ghost"
                            tamaño="sm"
                            disabled
                            icono={<CheckCircle2 size={14} />}
                            title="Marcar como atendida"
                            aria-label={`Marcar como atendida: ${cita.nombre_paciente}`}
                          />
                          <Button
                            variante="ghost"
                            tamaño="sm"
                            disabled={!onReprogramarCita || reprogramandoId === cita.id_cita}
                            icono={<RefreshCw size={14} />}
                            title="Reagendar"
                            aria-label={`Reagendar cita: ${cita.nombre_paciente}`}
                            onClick={() => onReprogramarCita?.(cita)}
                          />
                          <Button
                            variante="ghost"
                            tamaño="sm"
                            disabled={!onCancelarCita || cancelandoId === cita.id_cita}
                            icono={<XCircle size={14} className="text-red-500" />}
                            title="Cancelar"
                            aria-label={`Cancelar cita: ${cita.nombre_paciente}`}
                            onClick={() => onCancelarCita?.(cita)}
                          />
                        </>
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
      {modoRecepcion && (
        <div className="flex items-start gap-2 px-3 py-2 text-xs text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Reprogramar o cancelar una cita agendada está disponible en sesión real.
            La reprogramación actualiza esta misma cita; su horario anterior no queda
            guardado. Alta y cambio a atendida siguen pendientes.
          </span>
        </div>
      )}
    </div>
  );
}
