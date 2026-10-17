import { useState, useEffect } from "react";
import { Search, UserPlus, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardHeader } from "../../components/ui/Card";
import { ToastDemo } from "../../components/ui/ToastDemo";
import { EstadoVacio } from "../../components/ui/EstadoVacio";
import { Modal } from "../../components/ui/Modal";
import { FormularioPaciente } from "../../components/shared/FormularioPaciente";
import {
  pacientesService,
  type PacienteAPI,
  type PaginacionAPI,
  type NuevoPaciente,
} from "../../lib/pacientesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

export function PacientesPage() {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const [pacientes, setPacientes]       = useState<PacienteAPI[]>([]);
  const [paginacion, setPaginacion]     = useState<PaginacionAPI | null>(null);
  const [pagina, setPagina]             = useState(1);
  const [busqueda, setBusqueda]         = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [recarga, setRecarga]           = useState(0);
  const [cargando, setCargando]         = useState(false);
  const [errorApi, setErrorApi]         = useState<string | null>(null);

  // Modal nuevo paciente
  const [modalNuevo, setModalNuevo]     = useState(false);
  const [guardando, setGuardando]       = useState(false);

  // Modal editar paciente
  const [pacienteEditar, setPacienteEditar] = useState<PacienteAPI | null>(null);

  // Toast
  const [toast, setToast]               = useState<{ msg: string; tipo: "exito" | "info" | "advertencia" } | null>(null);

  function mostrarToast(msg: string, tipo: "exito" | "info" | "advertencia" = "exito") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Cargar pacientes ─────────────────────────────────────────────────────
  useEffect(() => {
    let vigente = true;

    async function cargar() {
      await Promise.resolve();
      if (!vigente) return;

      setCargando(true);
      setErrorApi(null);
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
  }, [pagina, busqueda, recarga]);

  function handleBuscar() {
    const nuevaBusqueda = busquedaInput.trim();
    if (busqueda !== nuevaBusqueda) setBusqueda(nuevaBusqueda);
    if (pagina !== 1) setPagina(1);
  }

  // ─── Crear paciente ───────────────────────────────────────────────────────
  async function handleCrear(datos: NuevoPaciente) {
    setGuardando(true);
    const resp = await pacientesService.crear(datos);
    setGuardando(false);
    if (resp.error || !resp.data) {
      mostrarToast(resp.error ?? "Error al registrar paciente.", "advertencia");
      return;
    }
    setModalNuevo(false);
    mostrarToast(`Paciente "${resp.data.nombre} ${resp.data.ape_paterno}" registrado.`);
    setRecarga((actual) => actual + 1);
  }

  // ─── Editar paciente ──────────────────────────────────────────────────────
  async function handleEditar(datos: NuevoPaciente) {
    if (!pacienteEditar) return;
    setGuardando(true);
    const resp = await pacientesService.editar(pacienteEditar.id_paciente, datos);
    setGuardando(false);
    if (resp.error || !resp.data) {
      mostrarToast(resp.error ?? "Error al actualizar paciente.", "advertencia");
      return;
    }
    setPacienteEditar(null);
    mostrarToast("Paciente actualizado correctamente.");
    setRecarga((actual) => actual + 1);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {paginacion ? `${paginacion.total} pacientes registrados` : "Cargando…"}
          </p>
        </div>
        <Button
          variante="primary"
          icono={<UserPlus size={16} />}
          onClick={() => setModalNuevo(true)}
        >
          Nuevo paciente
        </Button>
      </div>

      {/* Buscador */}
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
          <Button variante="secondary" onClick={handleBuscar}>
            Buscar
          </Button>
          {busqueda && (
            <Button variante="ghost" onClick={() => {
              setBusquedaInput("");
              if (busqueda) setBusqueda("");
              if (pagina !== 1) setPagina(1);
            }}>
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {/* Error de API */}
      {errorApi && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {errorApi}
        </div>
      )}

      {/* Tabla */}
      <Card padding={false}>
        <div className="p-5 border-b border-brand-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-brand-800">
            {cargando
              ? "Cargando…"
              : `${paginacion?.total ?? 0} resultado${(paginacion?.total ?? 0) !== 1 ? "s" : ""}`}
          </span>
        </div>

        {errorApi ? null : cargando ? (
          <div className="py-16 text-center text-sm text-gray-400">Cargando pacientes…</div>
        ) : pacientes.length === 0 ? (
          <EstadoVacio
            titulo="No se encontraron pacientes"
            descripcion={busqueda ? "Intenta con otro nombre." : "Aún no hay pacientes registrados."}
            accion={
              busqueda ? (
                <Button variante="secondary" onClick={() => {
                  setBusquedaInput("");
                  if (busqueda) setBusqueda("");
                  if (pagina !== 1) setPagina(1);
                }}>
                  Ver todos
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Lista de pacientes">
              <thead>
                <tr className="bg-brand-100 text-brand-800">
                  <th className="text-left px-4 py-3 font-semibold">Paciente</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Edad</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Sexo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Correo</th>
                  <th className="text-left px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p, i) => (
                  <tr
                    key={p.id_paciente}
                    className={`border-t border-brand-200 hover:bg-brand-100 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-brand-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-bold select-none flex-shrink-0">
                          {iniciales(p)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {p.nombre} {p.ape_paterno} {p.ape_materno}
                          </p>
                          <p className="text-xs text-gray-400">ID {p.id_paciente}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {calcularEdad(p.fecha_nacimiento)} años
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {p.sexo}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {p.telefono ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell truncate max-w-[160px]">
                      {p.correo ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variante="ghost" tamaño="sm"
                          icono={<Edit size={14} />}
                          onClick={() => setPacienteEditar(p)}
                          aria-label={`Editar: ${p.nombre}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {paginacion && paginacion.paginas > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-200">
            <span className="text-xs text-gray-500">
              Página {paginacion.pagina} de {paginacion.paginas}
            </span>
            <div className="flex gap-2">
              <Button
                variante="secondary" tamaño="sm"
                icono={<ChevronLeft size={14} />}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >
                Anterior
              </Button>
              <Button
                variante="secondary" tamaño="sm"
                iconoDerecho={<ChevronRight size={14} />}
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= paginacion.paginas}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal nuevo paciente */}
      <Modal
        abierto={modalNuevo}
        titulo="Registrar nuevo paciente"
        onCerrar={() => setModalNuevo(false)}
        ancho="max-w-2xl"
      >
        <FormularioPaciente
          onGuardar={handleCrear}
          onCancelar={() => setModalNuevo(false)}
          cargando={guardando}
        />
      </Modal>

      {/* Modal editar paciente */}
      <Modal
        abierto={!!pacienteEditar}
        titulo="Editar paciente"
        onCerrar={() => setPacienteEditar(null)}
        ancho="max-w-2xl"
      >
        {pacienteEditar && (
          <FormularioPaciente
            inicial={{
              nombre:           pacienteEditar.nombre,
              ape_paterno:      pacienteEditar.ape_paterno,
              ape_materno:      pacienteEditar.ape_materno,
              fecha_nacimiento: pacienteEditar.fecha_nacimiento,
              sexo:             pacienteEditar.sexo,
              telefono:         pacienteEditar.telefono ?? "",
              correo:           pacienteEditar.correo ?? "",
              direccion:        pacienteEditar.direccion ?? "",
            }}
            onGuardar={handleEditar}
            onCancelar={() => setPacienteEditar(null)}
            cargando={guardando}
          />
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <ToastDemo mensaje={toast.msg} tipo={toast.tipo} onCerrar={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
