import { useState, type FormEvent } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { TablaCitas } from "../../components/shared/TablaCitas";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EstadoVacio } from "../../components/ui/EstadoVacio";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { useAgendaCitas } from "../../hooks/useAgendaCitas";
import { useDemo } from "../../store/demo-context";
import type { Cita } from "../../types";
import { consultasService } from "../../lib/consultasService";

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
  const { usuarioAutenticado } = useDemo();
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [motivo, setMotivo] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [consultaGuardada, setConsultaGuardada] = useState(false);
  const nombreMedico = usuarioAutenticado
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
    recargarCitas,
    setPagina,
    total,
  } = useAgendaCitas();

  function iniciarConsulta(cita: Cita) {
    setCitaSeleccionada(cita);
    setMotivo("");
    setDiagnostico("");
    setObservaciones("");
    setTratamiento("");
    setErrorConsulta(null);
    setConsultaGuardada(false);
  }

  function cerrarConsulta() {
    if (guardando) return;
    setCitaSeleccionada(null);
  }

  async function guardarConsulta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!citaSeleccionada || consultaGuardada) return;
    if (![motivo, diagnostico, observaciones, tratamiento].some((valor) => valor.trim())) {
      setErrorConsulta("Registra al menos un dato clínico.");
      return;
    }
    setGuardando(true);
    setErrorConsulta(null);
    const respuesta = await consultasService.registrar(citaSeleccionada.id_cita, {
      motivo,
      diagnostico,
      observaciones,
      tratamiento,
    });
    setGuardando(false);
    if (respuesta.error || !respuesta.data) {
      setErrorConsulta(respuesta.error ?? "No se pudo registrar la consulta.");
      return;
    }
    setConsultaGuardada(true);
    recargarCitas();
  }

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
            <TablaCitas
              citas={citas}
              modoMedico
              onRegistrarConsulta={iniciarConsulta}
            />
          )}
        </div>
      </Card>

      <Modal
        abierto={citaSeleccionada !== null}
        titulo={`Consulta · ${citaSeleccionada?.nombre_paciente ?? ""}`}
        onCerrar={cerrarConsulta}
      >
        {consultaGuardada ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
              Consulta registrada correctamente. La cita ahora aparece como atendida.
            </p>
            <p className="text-sm text-gray-600">
              Puedes emitir una receta desde el historial clínico del paciente.
            </p>
            <Button onClick={cerrarConsulta}>Cerrar</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={guardarConsulta}>
            {errorConsulta && <p className="text-sm text-red-700" role="alert">{errorConsulta}</p>}
            {([
              ["Motivo", motivo, setMotivo],
              ["Diagnóstico", diagnostico, setDiagnostico],
              ["Observaciones", observaciones, setObservaciones],
              ["Tratamiento", tratamiento, setTratamiento],
            ] as const).map(([label, value, setter]) => (
              <label key={label} className="block text-sm font-medium text-brand-800">
                {label}
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  maxLength={10000}
                  disabled={guardando}
                />
              </label>
            ))}
            <div className="flex justify-end gap-2">
              <Button variante="secondary" type="button" onClick={cerrarConsulta} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" cargando={guardando}>Guardar consulta</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
