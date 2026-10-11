import { useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { CITAS_DEMO, MEDICOS_DEMO } from "../../utils/datosDemo";
import { TablaCitas } from "../../components/shared/TablaCitas";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Card, CardHeader } from "../../components/ui/Card";
import { ToastDemo } from "../../components/ui/ToastDemo";
import type { EstadoCita } from "../../types";

export function AgendaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroMedico, setFiltroMedico] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoCita | "todos">("todos");
  const [toast, setToast] = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Filtrado en el cliente (datos demo)
  const citasFiltradas = CITAS_DEMO.filter((c) => {
    const coincideBusqueda =
      busqueda === "" ||
      c.paciente.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.motivo.toLowerCase().includes(busqueda.toLowerCase());

    const coincideMedico =
      filtroMedico === "todos" || c.medico === filtroMedico;

    const coincideEstado =
      filtroEstado === "todos" || c.estado === filtroEstado;

    return coincideBusqueda && coincideMedico && coincideEstado;
  });

  // Contadores para tarjetas resumen
  const programadas = CITAS_DEMO.filter((c) => c.estado === "programada").length;
  const atendidas   = CITAS_DEMO.filter((c) => c.estado === "atendida").length;
  const canceladas  = CITAS_DEMO.filter((c) => c.estado === "cancelada").length;
  const reagendadas = CITAS_DEMO.filter((c) => c.estado === "reagendada").length;

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Agenda del día</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sábado, 10 de octubre de 2026 · ClinicTec Norte
          </p>
        </div>
        <Button
          variante="primary"
          icono={<Plus size={16} />}
          onClick={() => mostrarToast("DEMO: En producción, esto abriría el formulario de nueva cita.")}
        >
          Nueva cita
        </Button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Programadas"
          valor={programadas}
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

      {/* Filtros */}
      <Card>
        <CardHeader titulo="Filtros" subtitulo="Filtra las citas del día" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            placeholder="Buscar paciente o motivo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            iconoIzquierdo={<Search size={15} />}
            aria-label="Buscar cita"
          />
          <Select
            value={filtroMedico}
            onChange={(e) => setFiltroMedico(e.target.value)}
            aria-label="Filtrar por médico"
          >
            <option value="todos">Todos los médicos</option>
            {MEDICOS_DEMO.filter((m) => m.activo).map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </Select>
          <Select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoCita | "todos")}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="programada">Programada</option>
            <option value="atendida">Atendida</option>
            <option value="cancelada">Cancelada</option>
            <option value="reagendada">Reagendada</option>
          </Select>
        </div>
      </Card>

      {/* Tabla de citas */}
      <Card padding={false}>
        <div className="p-5 border-b border-brand-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-500" aria-hidden="true" />
            <span className="text-sm font-semibold text-brand-800">
              {citasFiltradas.length} cita{citasFiltradas.length !== 1 ? "s" : ""}
              {(busqueda || filtroMedico !== "todos" || filtroEstado !== "todos") &&
                " (filtradas)"}
            </span>
          </div>
          {(busqueda || filtroMedico !== "todos" || filtroEstado !== "todos") && (
            <Button
              variante="ghost"
              tamaño="sm"
              icono={<Filter size={13} />}
              onClick={() => {
                setBusqueda("");
                setFiltroMedico("todos");
                setFiltroEstado("todos");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="p-1">
          <TablaCitas citas={citasFiltradas} modoRecepcion />
        </div>
      </Card>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <ToastDemo mensaje={toast} tipo="info" onCerrar={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
