import { useState, useEffect, type FormEvent } from "react";
import { Search, FileText, ClipboardList, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardHeader } from "../../components/ui/Card";
import { EstadoVacio } from "../../components/ui/EstadoVacio";
import {
  pacientesService,
  type HistorialPacienteAPI,
  type PacienteAPI,
  type PaginacionAPI,
} from "../../lib/pacientesService";
import { consultasService } from "../../lib/consultasService";

// La vista del médico lista sus pacientes a través del historial de citas.
// El endpoint GET /api/pacientes filtra por médico en el servidor.

function calcularEdad(fechaNac: string): number {
  const hoy = new Date();
  const [anio, mes, dia] = fechaNac.split("-").map(Number);
  const nac = new Date(anio, mes - 1, dia);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function iniciales(p: PacienteAPI): string {
  return `${p.nombre[0] ?? ""}${p.ape_paterno[0] ?? ""}`.toUpperCase();
}

export function MisPacientesPage() {
  const [pacientes, setPacientes]         = useState<PacienteAPI[]>([]);
  const [paginacion, setPaginacion]       = useState<PaginacionAPI | null>(null);
  const [pagina, setPagina]               = useState(1);
  const [cargando, setCargando]           = useState(false);
  const [errorApi, setErrorApi]           = useState<string | null>(null);
  const [busqueda, setBusqueda]           = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [expandido, setExpandido]         = useState<number | null>(null);
  const [historial, setHistorial]         = useState<HistorialPacienteAPI | null>(null);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [recetaConsultaId, setRecetaConsultaId] = useState<number | null>(null);
  const [indicacionesReceta, setIndicacionesReceta] = useState("");
  const [detallesReceta, setDetallesReceta] = useState([{
    medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "",
  }]);
  const [guardandoReceta, setGuardandoReceta] = useState(false);
  const [errorReceta, setErrorReceta] = useState<string | null>(null);
  const [recetaGuardada, setRecetaGuardada] = useState(false);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      await Promise.resolve();
      if (!vigente) return;

      setCargando(true);
      setErrorApi(null);
      // El médico usa el mismo endpoint; el backend filtra por su token
      const resp = await pacientesService.listar(pagina, 20, busqueda);
      if (!vigente) return;

      setCargando(false);
      if (resp.error || !resp.data) {
        setPacientes([]);
        setPaginacion(null);
        setErrorApi(resp.error ?? "Error al cargar pacientes.");
        return;
      }
      setPacientes(resp.data.pacientes);
      setPaginacion(resp.data.paginacion);
    }

    void cargar();
    return () => {
      vigente = false;
    };
  }, [pagina, busqueda]);

  function handleBuscar() {
    setBusqueda(busquedaInput.trim());
    setPagina(1);
  }

  async function verHistorial(idPaciente: number) {
    setExpandido(idPaciente);
    setHistorial(null);
    setHistorialError(null);
    setHistorialCargando(true);
    const response = await pacientesService.historial(idPaciente);
    setHistorialCargando(false);
    if (response.error || !response.data) {
      setHistorialError(response.error ?? "No se pudo cargar el historial clínico.");
      return;
    }
    setHistorial(response.data);
  }

  function iniciarReceta(idConsulta: number) {
    setRecetaConsultaId(idConsulta);
    setIndicacionesReceta("");
    setDetallesReceta([{
      medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "",
    }]);
    setErrorReceta(null);
    setRecetaGuardada(false);
  }

  async function emitirReceta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recetaConsultaId === null) return;
    setGuardandoReceta(true);
    setErrorReceta(null);
    const response = await consultasService.emitirReceta(recetaConsultaId, {
      indicaciones: indicacionesReceta,
      detalles: detallesReceta,
    });
    setGuardandoReceta(false);
    if (response.error || !response.data) {
      setErrorReceta(response.error ?? "No se pudo emitir la receta.");
      return;
    }
    setRecetaGuardada(true);
    setRecetaConsultaId(null);
    if (expandido !== null) await verHistorial(expandido);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Mis pacientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {cargando
            ? "Cargando…"
            : `${paginacion?.total ?? pacientes.length} paciente${(paginacion?.total ?? pacientes.length) !== 1 ? "s" : ""} asignado${(paginacion?.total ?? pacientes.length) !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card>
        <CardHeader titulo="Buscar paciente" />
        <div className="flex gap-2">
          <Input
            placeholder="Nombre o apellido…"
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            iconoIzquierdo={<Search size={15} />}
            aria-label="Buscar paciente"
            className="flex-1"
          />
          <Button variante="secondary" onClick={handleBuscar}>Buscar</Button>
          {busqueda && (
            <Button variante="ghost" onClick={() => { setBusqueda(""); setBusquedaInput(""); setPagina(1); }}>
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {errorApi && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          {errorApi}
        </div>
      )}

      {!errorApi && (cargando ? (
        <div className="py-16 text-center text-sm text-gray-400">Cargando pacientes…</div>
      ) : pacientes.length === 0 ? (
        <EstadoVacio
          titulo="Sin pacientes asignados"
          descripcion={busqueda ? "Ningún paciente coincide con la búsqueda." : "No tienes pacientes vinculados a tus citas."}
        />
      ) : (
        <div className="space-y-3">
          {pacientes.map((p) => (
            <div
              key={p.id_paciente}
              className="bg-white border border-brand-200 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Cabecera */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                onClick={() => setExpandido(expandido === p.id_paciente ? null : p.id_paciente)}
                aria-expanded={expandido === p.id_paciente}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-sm font-bold select-none flex-shrink-0">
                    {iniciales(p)}
                  </div>
                  <div>
                    <p className="font-semibold text-brand-800">
                      {p.nombre} {p.ape_paterno} {p.ape_materno}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID {p.id_paciente} · {calcularEdad(p.fecha_nacimiento)} años · {p.sexo}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {expandido === p.id_paciente ? "▲ Ocultar" : "▼ Detalle"}
                </span>
              </button>

              {/* Detalle expandible */}
              {expandido === p.id_paciente && (
                <div className="border-t border-brand-100 px-5 py-4 bg-brand-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {p.telefono && (
                      <div>
                        <p className="text-xs font-medium text-brand-800">Teléfono</p>
                        <p className="text-sm text-gray-700">{p.telefono}</p>
                      </div>
                    )}
                    {p.correo && (
                      <div>
                        <p className="text-xs font-medium text-brand-800">Correo</p>
                        <p className="text-sm text-gray-700">{p.correo}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-brand-800">Fecha de nacimiento</p>
                      <p className="text-sm text-gray-700">{p.fecha_nacimiento}</p>
                    </div>
                    {p.direccion && (
                      <div>
                        <p className="text-xs font-medium text-brand-800">Dirección</p>
                        <p className="text-sm text-gray-700">{p.direccion}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variante="secondary" tamaño="sm"
                      icono={<FileText size={14} />}
                      onClick={() => void verHistorial(p.id_paciente)}
                      cargando={historialCargando && expandido === p.id_paciente}
                    >
                      Ver historial
                    </Button>
                  </div>
                  {expandido === p.id_paciente && (
                    <section className="mt-4 border-t border-brand-200 pt-4" aria-label="Historial clínico">
                      {recetaGuardada && <p role="status" className="text-sm text-green-800">Receta emitida correctamente.</p>}
                      {historialCargando ? (
                        <p role="status" className="text-sm text-gray-500">Cargando historial clínico…</p>
                      ) : historialError ? (
                        <p role="alert" className="text-sm text-red-700">{historialError}</p>
                      ) : historial?.paciente.id_paciente === p.id_paciente ? (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-brand-800">Consultas previas</h3>
                          {historial.citas.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay citas en tu historial con este paciente.</p>
                          ) : historial.citas.map((cita) => (
                            <article key={cita.id_cita} className="rounded-lg border border-brand-200 bg-white p-4">
                              <p className="text-sm font-medium text-gray-800">
                                {cita.fecha} · {cita.hora} · {cita.estado}
                              </p>
                              {cita.consulta ? (
                                <div className="mt-3 space-y-3 text-sm">
                                  {([
                                    ["Motivo", cita.consulta.motivo],
                                    ["Diagnóstico", cita.consulta.diagnostico],
                                    ["Observaciones", cita.consulta.observaciones],
                                    ["Tratamiento", cita.consulta.tratamiento],
                                  ] as const).map(([label, value]) => value && (
                                    <p key={label}><strong>{label}:</strong> {value}</p>
                                  ))}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold">Recetas</h4>
                                    {cita.consulta.recetas.map((receta) => (
                                      <div key={receta.id_receta} className="rounded bg-brand-50 p-3">
                                        <p>{receta.fecha_receta ?? "Fecha no disponible"}</p>
                                        {receta.indicaciones && <p>{receta.indicaciones}</p>}
                                        <ul className="mt-2 list-disc pl-5">
                                          {receta.detalles.map((detalle) => (
                                            <li key={detalle.id_detalle}>
                                              {detalle.medicamento}
                                              {[
                                                detalle.dosis,
                                                detalle.frecuencia,
                                                detalle.duracion,
                                                detalle.indicaciones,
                                              ].filter(Boolean).join(" · ") && ` — ${[
                                                detalle.dosis,
                                                detalle.frecuencia,
                                                detalle.duracion,
                                                detalle.indicaciones,
                                              ].filter(Boolean).join(" · ")}`}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                  <Button
                                    variante="secondary"
                                    tamaño="sm"
                                    icono={<ClipboardList size={14} />}
                                    onClick={() => iniciarReceta(cita.consulta!.id_consulta)}
                                  >
                                    Emitir receta
                                  </Button>
                                  {recetaConsultaId === cita.consulta.id_consulta && (
                                    <form onSubmit={emitirReceta} className="space-y-3 border-t border-brand-200 pt-3">
                                      {errorReceta && <p role="alert" className="text-sm text-red-700">{errorReceta}</p>}
                                      <label className="block text-sm font-medium">
                                        Indicaciones generales
                                        <textarea
                                          className="mt-1 w-full rounded border border-brand-200 p-2"
                                          value={indicacionesReceta}
                                          maxLength={10000}
                                          onChange={(event) => setIndicacionesReceta(event.target.value)}
                                        />
                                      </label>
                                      {detallesReceta.map((detalle, index) => (
                                        <fieldset key={index} className="grid gap-2 rounded border border-brand-200 p-3 sm:grid-cols-2">
                                          <legend className="px-1 text-sm font-semibold">Medicamento {index + 1}</legend>
                                          {([
                                            ["medicamento", "Medicamento", 150],
                                            ["dosis", "Dosis", 100],
                                            ["frecuencia", "Frecuencia", 100],
                                            ["duracion", "Duración", 100],
                                            ["indicaciones", "Indicaciones", 10000],
                                          ] as const).map(([field, label, maxLength]) => (
                                            <label key={field} className="text-xs font-medium text-brand-800">
                                              {label}
                                              <input
                                                className="mt-1 w-full rounded border border-brand-200 px-2 py-1.5 text-sm"
                                                value={detalle[field]}
                                                maxLength={maxLength}
                                                required={field === "medicamento"}
                                                onChange={(event) => setDetallesReceta((actual) =>
                                                  actual.map((item, itemIndex) => itemIndex === index
                                                    ? { ...item, [field]: event.target.value }
                                                    : item)
                                                )}
                                              />
                                            </label>
                                          ))}
                                          {detallesReceta.length > 1 && (
                                            <Button
                                              type="button"
                                              variante="ghost"
                                              tamaño="sm"
                                              onClick={() => setDetallesReceta((actual) => actual.filter((_, i) => i !== index))}
                                            >
                                              Quitar medicamento
                                            </Button>
                                          )}
                                        </fieldset>
                                      ))}
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          variante="secondary"
                                          tamaño="sm"
                                          onClick={() => setDetallesReceta((actual) => [...actual, {
                                            medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "",
                                          }])}
                                        >
                                          Agregar medicamento
                                        </Button>
                                        <Button type="submit" tamaño="sm" cargando={guardandoReceta}>
                                          Guardar receta
                                        </Button>
                                      </div>
                                    </form>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-gray-500">Sin consulta registrada.</p>
                              )}
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  )}
                </div>
              )}
            </div>
          ))}

          {paginacion && paginacion.paginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border border-brand-200 rounded-xl bg-white">
              <span className="text-xs text-gray-500">
                Página {paginacion.pagina} de {paginacion.paginas}
              </span>
              <div className="flex gap-2">
                <Button
                  variante="secondary" tamaño="sm"
                  icono={<ChevronLeft size={14} />}
                  onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                  disabled={pagina <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variante="secondary" tamaño="sm"
                  iconoDerecho={<ChevronRight size={14} />}
                  onClick={() => setPagina((actual) => actual + 1)}
                  disabled={pagina >= paginacion.paginas}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

    </div>
  );
}
