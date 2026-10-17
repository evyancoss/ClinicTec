import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";
import { TablaCitas } from "../../components/shared/TablaCitas";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EstadoVacio } from "../../components/ui/EstadoVacio";
import { Input, Select } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { useAgendaCitas } from "../../hooks/useAgendaCitas";
import { citasService } from "../../lib/citasService";
import { medicosService, type MedicoAPI } from "../../lib/medicosService";
import { pacientesService, type PacienteAPI } from "../../lib/pacientesService";
import { useDemo } from "../../store/demo-context";
import type { Cita, EstadoCita } from "../../types";

type FiltroEstado = EstadoCita | "todos";

function etiquetaFecha(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AgendaPage() {
  const { modoDemo } = useDemo();
  const [busqueda, setBusqueda] = useState("");
  const [filtroMedico, setFiltroMedico] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [pacientesOpciones, setPacientesOpciones] = useState<PacienteAPI[]>([]);
  const [medicosOpciones, setMedicosOpciones] = useState<MedicoAPI[]>([]);
  const [idPacienteNuevo, setIdPacienteNuevo] = useState("");
  const [idMedicoNuevo, setIdMedicoNuevo] = useState("");
  const [fechaNueva, setFechaNueva] = useState("");
  const [horaNueva, setHoraNueva] = useState("");
  const [motivoNuevo, setMotivoNuevo] = useState("");
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [guardandoCita, setGuardandoCita] = useState(false);
  const [errorNuevaCita, setErrorNuevaCita] = useState<string | null>(null);
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
  } = useAgendaCitas(modoDemo);

  useEffect(() => {
    if (!modalNuevaCita || modoDemo) return;
    let vigente = true;
    async function cargarOpciones() {
      setCargandoOpciones(true);
      setErrorNuevaCita(null);
      try {
        const [respuestaPacientes, respuestaMedicos] = await Promise.all([
          pacientesService.listar(1, 100),
          medicosService.listar(),
        ]);
        if (respuestaPacientes.error || !respuestaPacientes.data) {
          throw new Error(respuestaPacientes.error ?? "No se pudieron cargar los pacientes.");
        }
        if (respuestaMedicos.error || !respuestaMedicos.data) {
          throw new Error(respuestaMedicos.error ?? "No se pudieron cargar los médicos.");
        }
        if (!vigente) return;
        setPacientesOpciones(respuestaPacientes.data.pacientes);
        setMedicosOpciones(
          respuestaMedicos.data.filter((medico) => medico.id_clinica === 1),
        );
      } catch (errorDesconocido: unknown) {
        if (!vigente) return;
        setErrorNuevaCita(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : "No se pudieron cargar las opciones para la cita.",
        );
      } finally {
        if (vigente) setCargandoOpciones(false);
      }
    }
    void cargarOpciones();
    return () => {
      vigente = false;
    };
  }, [modalNuevaCita, modoDemo]);

  async function buscarPacientes() {
    setCargandoOpciones(true);
    setErrorNuevaCita(null);
    try {
      const respuesta = await pacientesService.listar(
        1,
        100,
        busquedaPaciente.trim(),
      );
      if (respuesta.error || !respuesta.data) {
        setErrorNuevaCita(
          respuesta.error ?? "No se pudieron buscar los pacientes.",
        );
        return;
      }
      setPacientesOpciones(respuesta.data.pacientes);
    } catch (errorDesconocido) {
      setErrorNuevaCita(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudieron buscar los pacientes.",
      );
    } finally {
      setCargandoOpciones(false);
    }
  }

  function abrirNuevaCita() {
    if (modoDemo) return;
    setIdPacienteNuevo("");
    setIdMedicoNuevo("");
    setFechaNueva(fecha);
    setHoraNueva("");
    setMotivoNuevo("");
    setBusquedaPaciente("");
    setErrorNuevaCita(null);
    setModalNuevaCita(true);
  }

  async function crearCita(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (modoDemo) return;
    setGuardandoCita(true);
    setErrorNuevaCita(null);
    try {
      const respuesta = await citasService.crear({
        id_paciente: Number(idPacienteNuevo),
        id_medico: Number(idMedicoNuevo),
        fecha: fechaNueva,
        hora: horaNueva,
        motivo: motivoNuevo.trim() || undefined,
      });
      if (respuesta.error || !respuesta.data) {
        setErrorNuevaCita(respuesta.error ?? "No se pudo registrar la cita.");
        return;
      }
      setModalNuevaCita(false);
      setMensajeAccion("La cita se registró correctamente.");
      if (fechaNueva !== fecha) cambiarFecha(fechaNueva);
      else recargarCitas();
    } catch (errorDesconocido) {
      setErrorNuevaCita(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo registrar la cita.",
      );
    } finally {
      setGuardandoCita(false);
    }
  }

  async function cancelarCita(cita: Cita) {
    if (modoDemo || cita.estado !== "Agendada") return;
    if (!window.confirm(`¿Cancelar la cita de ${cita.nombre_paciente}?`)) return;

    setCancelandoId(cita.id_cita);
    setMensajeAccion(null);
    setErrorAccion(null);
    try {
      const respuesta = await citasService.cancelar(cita.id_cita);
      if (respuesta.error || !respuesta.data) {
        setErrorAccion(respuesta.error ?? "No se pudo cancelar la cita.");
        return;
      }
      setMensajeAccion("La cita se canceló correctamente.");
      recargarCitas();
    } catch (errorDesconocido) {
      setErrorAccion(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo cancelar la cita.",
      );
    } finally {
      setCancelandoId(null);
    }
  }

  const citasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    return citas.filter((cita) => {
      const coincideBusqueda = !termino
        || cita.nombre_paciente.toLocaleLowerCase().includes(termino)
        || (cita.motivo ?? "").toLocaleLowerCase().includes(termino);
      const coincideMedico = filtroMedico === "todos"
        || cita.nombre_medico === filtroMedico;
      const coincideEstado = filtroEstado === "todos"
        || cita.estado === filtroEstado;
      return coincideBusqueda && coincideMedico && coincideEstado;
    });
  }, [busqueda, citas, filtroEstado, filtroMedico]);

  const agendadas = citasFiltradas.filter((cita) => cita.estado === "Agendada").length;
  const atendidas = citasFiltradas.filter((cita) => cita.estado === "Atendida").length;
  const canceladas = citasFiltradas.filter((cita) => cita.estado === "Cancelada").length;
  const reagendadas = citasFiltradas.filter((cita) => cita.estado === "Reagendada").length;
  const medicosEnPagina = [...new Set(citas.map((cita) => cita.nombre_medico))];
  const hayFiltros = Boolean(busqueda) || filtroMedico !== "todos" || filtroEstado !== "todos";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-brand-800">Agenda del día</h2>
          <p className="mt-0.5 text-sm text-gray-500">{etiquetaFecha(fecha)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Fecha de agenda"
            type="date"
            value={fecha}
            onChange={(event) => cambiarFecha(event.target.value)}
            aria-label="Fecha de agenda"
          />
          <Button
            variante="primary"
            disabled={modoDemo}
            title={modoDemo ? "El alta no está disponible en modo demostración." : undefined}
            aria-label={modoDemo ? "Nueva cita (no disponible en demo)" : "Nueva cita"}
            onClick={abrirNuevaCita}
          >
            Nueva cita
          </Button>
          <p className="basis-full text-right text-xs text-gray-500">
            {modoDemo
              ? "El alta solo está disponible en una sesión real."
              : "Las citas nuevas duran 60 minutos; el horario se valida en el servidor."}
          </p>
        </div>
      </div>

      {modoDemo && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Datos ficticios de demostración; no provienen de la API.
        </p>
      )}
      {mensajeAccion && (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {mensajeAccion}
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorAccion}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TarjetaResumen
          titulo="Agendadas"
          valor={agendadas}
          icono={<Clock size={20} />}
          colorIcono="bg-brand-100 text-brand-500"
        />
        <TarjetaResumen
          titulo="Atendidas"
          valor={atendidas}
          icono={<CheckCircle size={20} />}
          colorIcono="bg-green-100 text-green-600"
        />
        <TarjetaResumen
          titulo="Canceladas"
          valor={canceladas}
          icono={<XCircle size={20} />}
          colorIcono="bg-red-100 text-red-500"
        />
        <TarjetaResumen
          titulo="Reagendadas"
          valor={reagendadas}
          icono={<RefreshCw size={20} />}
          colorIcono="bg-amber-100 text-amber-500"
        />
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            placeholder="Buscar paciente o motivo…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            aria-label="Buscar cita"
          />
          <Select
            value={filtroMedico}
            onChange={(event) => setFiltroMedico(event.target.value)}
            aria-label="Filtrar por médico"
          >
            <option value="todos">Todos los médicos de esta página</option>
            {medicosEnPagina.map((medico) => (
              <option key={medico} value={medico}>{medico}</option>
            ))}
          </Select>
          <Select
            value={filtroEstado}
            onChange={(event) => setFiltroEstado(event.target.value as FiltroEstado)}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="Agendada">Agendada</option>
            <option value="Atendida">Atendida</option>
            <option value="Cancelada">Cancelada</option>
            <option value="Reagendada">Reagendada</option>
          </Select>
        </div>
        {hayFiltros && (
          <Button
            variante="ghost"
            tamaño="sm"
            className="mt-3"
            onClick={() => {
              setBusqueda("");
              setFiltroMedico("todos");
              setFiltroEstado("todos");
            }}
          >
            Limpiar filtros
          </Button>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Los filtros se aplican a las citas de la página actual.
        </p>
      </Card>

      <Card padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-200 p-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-500" aria-hidden="true" />
            <span className="text-sm font-semibold text-brand-800">
              {total} cita{total !== 1 ? "s" : ""} para esta fecha
              {hayFiltros && ` · ${citasFiltradas.length} en esta página`}
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
              No se pudo cargar la agenda: {error}
            </p>
          ) : citasFiltradas.length === 0 ? (
            <EstadoVacio
              titulo={citas.length === 0 ? "Sin citas" : "Sin coincidencias"}
              descripcion={citas.length === 0
                ? "No hay citas para la fecha seleccionada."
                : "Ninguna cita de esta página coincide con los filtros."}
            />
          ) : (
            <TablaCitas
              citas={citasFiltradas}
              modoRecepcion
              onCancelarCita={modoDemo ? undefined : cancelarCita}
              cancelandoId={cancelandoId}
            />
          )}
        </div>
      </Card>

      <Modal
        abierto={modalNuevaCita}
        titulo="Registrar cita"
        onCerrar={() => {
          if (!guardandoCita) setModalNuevaCita(false);
        }}
        ancho="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={crearCita}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Buscar paciente"
              value={busquedaPaciente}
              onChange={(event) => setBusquedaPaciente(event.target.value)}
              maxLength={100}
              placeholder="Nombre o apellido"
            />
            <div className="flex items-end">
              <Button
                type="button"
                variante="secondary"
                onClick={buscarPacientes}
                disabled={cargandoOpciones}
              >
                Buscar pacientes
              </Button>
            </div>
            <Select
              label="Paciente"
              value={idPacienteNuevo}
              onChange={(event) => setIdPacienteNuevo(event.target.value)}
              required
              disabled={cargandoOpciones}
            >
              <option value="">Selecciona un paciente</option>
              {pacientesOpciones.map((paciente) => (
                <option key={paciente.id_paciente} value={paciente.id_paciente}>
                  {[paciente.nombre, paciente.ape_paterno, paciente.ape_materno]
                    .filter(Boolean)
                    .join(" ")}
                </option>
              ))}
            </Select>
            <Select
              label="Médico"
              value={idMedicoNuevo}
              onChange={(event) => setIdMedicoNuevo(event.target.value)}
              required
              disabled={cargandoOpciones}
            >
              <option value="">Selecciona un médico</option>
              {medicosOpciones.map((medico) => (
                <option key={medico.id_medico} value={medico.id_medico}>
                  {medico.nombre} {medico.ape_paterno} {medico.ape_materno} · {medico.especialidad}
                </option>
              ))}
            </Select>
            <Input
              label="Fecha"
              type="date"
              value={fechaNueva}
              onChange={(event) => setFechaNueva(event.target.value)}
              required
            />
            <Input
              label="Hora"
              type="time"
              value={horaNueva}
              onChange={(event) => setHoraNueva(event.target.value)}
              required
            />
          </div>
          <Input
            label="Motivo (opcional)"
            value={motivoNuevo}
            onChange={(event) => setMotivoNuevo(event.target.value)}
            maxLength={255}
          />
          <p className="text-sm text-gray-600">
            Duración fija: 60 minutos. La clínica operativa y la disponibilidad se validan en el servidor.
          </p>
          {cargandoOpciones && (
            <p role="status" className="text-sm text-gray-500">
              Cargando pacientes y médicos…
            </p>
          )}
          {errorNuevaCita && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorNuevaCita}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variante="secondary"
              onClick={() => setModalNuevaCita(false)}
              disabled={guardandoCita}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              cargando={guardandoCita}
              disabled={cargandoOpciones || medicosOpciones.length === 0}
            >
              Guardar cita
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
