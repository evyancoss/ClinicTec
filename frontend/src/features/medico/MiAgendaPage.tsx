import { CalendarDays, Clock } from "lucide-react";
import { CITAS_DEMO, PROXIMAS_CITAS_DEMO } from "../../utils/datosDemo";
import { TablaCitas } from "../../components/shared/TablaCitas";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { Card, CardHeader } from "../../components/ui/Card";
import { BadgeEstado } from "../../components/ui/Badge";

// Filtrar solo las citas del médico demo
const MEDICO_ACTIVO = "Dra. Laura Vega";
const citasHoy = CITAS_DEMO.filter((c) => c.medico === MEDICO_ACTIVO);

export function MiAgendaPage() {
  const programadasHoy = citasHoy.filter((c) => c.estado === "programada").length;
  const atendidasHoy   = citasHoy.filter((c) => c.estado === "atendida").length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Mi agenda</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Sábado, 10 de octubre de 2026 · {MEDICO_ACTIVO}
        </p>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <TarjetaResumen
          titulo="Citas hoy"
          valor={citasHoy.length}
          icono={<CalendarDays size={20} />}
          colorIcono="bg-brand-100 text-brand-500"
        />
        <TarjetaResumen
          titulo="Pendientes"
          valor={programadasHoy}
          icono={<Clock size={20} />}
          colorIcono="bg-amber-100 text-amber-600"
        />
        <TarjetaResumen
          titulo="Atendidas hoy"
          valor={atendidasHoy}
          icono={<CalendarDays size={20} />}
          colorIcono="bg-green-100 text-green-600"
          descripcion={`de ${citasHoy.length} programadas`}
        />
      </div>

      {/* Citas de hoy */}
      <Card padding={false}>
        <div className="p-5 border-b border-brand-200 flex items-center gap-2">
          <CalendarDays size={18} className="text-brand-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-brand-800">
            Citas de hoy ({citasHoy.length})
          </span>
        </div>
        <div className="p-1">
          <TablaCitas citas={citasHoy} modoRecepcion={false} />
        </div>
      </Card>

      {/* Próximas citas */}
      <Card>
        <CardHeader
          titulo="Próximas citas"
          subtitulo="Los siguientes 3 días"
        />
        <div className="space-y-3">
          {PROXIMAS_CITAS_DEMO.map((cita) => (
            <div
              key={cita.id}
              className="flex items-center justify-between py-3 border-b border-brand-100 last:border-0"
            >
              <div className="flex items-start gap-3">
                <div className="bg-brand-100 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
                  <p className="text-xs text-brand-800 font-medium">
                    {new Date(cita.fecha).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="text-sm font-bold text-brand-800">{cita.hora}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{cita.paciente}</p>
                  <p className="text-xs text-gray-500">{cita.motivo}</p>
                </div>
              </div>
              <BadgeEstado estado={cita.estado} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
