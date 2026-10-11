import { useState, useEffect, useCallback } from "react";
import { Search, FileText, ClipboardList, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardHeader } from "../../components/ui/Card";
import { ToastDemo } from "../../components/ui/ToastDemo";
import { EstadoVacio } from "../../components/ui/EstadoVacio";
import {
  pacientesService,
  type PacienteAPI,
} from "../../lib/pacientesService";

// La vista del médico lista sus pacientes a través del historial de citas.
// El endpoint GET /api/pacientes filtra por médico en el servidor.

function calcularEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
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
  const [cargando, setCargando]           = useState(false);
  const [errorApi, setErrorApi]           = useState<string | null>(null);
  const [busqueda, setBusqueda]           = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [expandido, setExpandido]         = useState<number | null>(null);
  const [toast, setToast]                 = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorApi(null);
    // El médico usa el mismo endpoint; el backend filtra por su token
    const resp = await pacientesService.listar(1, 100, busqueda);
    setCargando(false);
    if (resp.error || !resp.data) {
      setErrorApi(resp.error ?? "Error al cargar pacientes.");
      return;
    }
    setPacientes(resp.data.pacientes);
  }, [busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  function handleBuscar() {
    setBusqueda(busquedaInput.trim());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Mis pacientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {cargando ? "Cargando…" : `${pacientes.length} paciente${pacientes.length !== 1 ? "s" : ""} asignado${pacientes.length !== 1 ? "s" : ""}`}
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
            <Button variante="ghost" onClick={() => { setBusqueda(""); setBusquedaInput(""); }}>
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

      {cargando ? (
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
                      onClick={() => mostrarToast("Historial clínico disponible en Fase 7.")}
                    >
                      Ver historial
                    </Button>
                    <Button
                      variante="primary" tamaño="sm"
                      icono={<ClipboardList size={14} />}
                      onClick={() => mostrarToast("Nueva consulta disponible en Fase 7.")}
                    >
                      Nueva consulta
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <ToastDemo mensaje={toast} tipo="info" onCerrar={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
