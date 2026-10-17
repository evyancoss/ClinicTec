import { CalendarDays, Clock } from "lucide-react";
import { TablaCitas } from "../../components/shared/TablaCitas";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { BadgeEstado } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { EstadoVacio } from "../../components/ui/EstadoVacio";
import { Input } from "../../components/ui/Input";
import { useAgendaCitas } from "../../hooks/useAgendaCitas";
import { useDemo } from "../../store/demo-context";
import { PROXIMAS_CITAS_DEMO } from "../../utils/datosDemo";

function etiquetaFecha(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function MiAgendaPage() {
  const { modoDemo, usuarioActivo, usuarioAutenticado } = useDemo();
  const nombreMedicoDemo = modoDemo ? usuarioActivo.nombre : undefined;
  const nombreMedico = modoDemo
    ? usuarioActivo.nombre
    : usuarioAutenticado
      ? `${usuarioAutenticado.nombre} ${usuarioAutenticado.ape_paterno} ${usuarioAutenticado.ape_materno}`
      : "Médico";
  const {
    citas,
    cargando,
    cambiarFecha,
    error,
    fecha,
    pagina,
    paginas,
    setPagina,
    total,
  } = useAgendaCitas(modoDemo, nombreMedicoDemo);

  const agendadas = citas.filter((cita) => cita.estado === "Agendada").length;
  const atendidas = citas.filter((cita) => cita.estado === "Atendida").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-brand-800">Mi agenda</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {etiquetaFecha(fecha)} · {nombreMedico}
          </p>
        </div>
        <Input
          label="Fecha de agenda"
          type="date"
          value={fecha}
          onChange={(event) => cambiarFecha(event.target.value)}
          aria-label="Fecha de agenda"
        />
      </div>

      {modoDemo && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Datos ficticios de demostración; no provienen de la API.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TarjetaResumen
          titulo="Citas de la fecha"
          valor={total}
          icono={<CalendarDays size={20} />}
          colorIcono="bg-brand-100 text-brand-500"
        />
        <TarjetaResumen
          titulo="Agendadas en página"
          valor={agendadas}
          icono={<Clock size={20} />}
          colorIcono="bg-amber-100 text-amber-600"
        />
        <TarjetaResumen
          titulo="Atendidas en página"
          valor={atendidas}
          icono={<CalendarDays size={20} />}
          colorIcono="bg-green-100 text-green-600"
        />
      </div>

      <Card padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-200 p-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-500" aria-hidden="true" />
            <span className="text-sm font-semibold text-brand-800">
              Citas de esta fecha ({total})
            </span>
          </div>
          {paginas > 1 && (
            <div className="flex items-center gap-2" aria-label="Paginación de citas">
              <Button
                variante="secondary"
                tamaño="sm"
                disabled={pagina <= 1 || cargando}
                onClick={() => setPagina(pagina - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {pagina} de {paginas}
              </span>
              <Button
                variante="secondary"
                tamaño="sm"
                disabled={pagina >= paginas || cargando}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
        <div className="p-1" aria-live="polite">
          {cargando ? (
            <p className="p-8 text-center text-sm text-gray-500" role="status">
              Cargando citas…
            </p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-red-700" role="alert">
              No se pudo cargar tu agenda: {error}
            </p>
          ) : citas.length === 0 ? (
            <EstadoVacio
              titulo="Sin citas"
              descripcion="No tienes citas para la fecha seleccionada."
            />
          ) : (
            <TablaCitas citas={citas} />
          )}
        </div>
      </Card>

      {modoDemo && (
        <Card>
          <CardHeader
            titulo="Próximas citas (demo)"
            subtitulo="Datos ficticios de los siguientes días"
          />
          <div className="space-y-3">
            {PROXIMAS_CITAS_DEMO
              .filter((cita) => cita.nombre_medico === nombreMedico)
              .map((cita) => (
                <div
                  key={cita.id_cita}
                  className="flex items-center justify-between gap-3 border-b border-brand-100 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {cita.nombre_paciente}
                    </p>
                    <p className="text-xs text-gray-500">
                      {etiquetaFecha(cita.fecha)} · {cita.hora}
                    </p>
                  </div>
                  <BadgeEstado estado={cita.estado} />
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
