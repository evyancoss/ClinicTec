import { useCallback, useEffect, useState } from "react";
import { Building2, CalendarDays, RefreshCw, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { adminService, type DashboardAdmin } from "../../lib/adminService";

const estadoLegible: Record<string, string> = {
  Agendada: "Agendadas",
  Atendida: "Atendidas",
  Cancelada: "Canceladas",
  Reagendada: "Reagendadas",
};

export function DashboardPage() {
  const [datos, setDatos] = useState<DashboardAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await adminService.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    adminService.dashboard()
      .then((resultado) => { if (vigente) setDatos(resultado); })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const resumen = datos?.resumen;
  const maxEstado = Math.max(1, ...(datos?.citas_por_estado.map((item) => item.total) ?? [0]));
  const fecha = datos?.fecha
    ? new Date(`${datos.fecha}T12:00:00`).toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">{fecha || "Indicadores actuales"}</p>
        </div>
        <Button variante="secondary" icono={<RefreshCw size={15} />} onClick={() => void cargar()} disabled={cargando}>
          Actualizar
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <button className="mt-2 font-semibold underline" onClick={() => void cargar()}>Reintentar</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy={cargando}>
        <TarjetaResumen titulo="Citas hoy" valor={cargando ? "—" : resumen?.citas_hoy ?? 0} descripcion="Todas las clínicas" icono={<CalendarDays size={20} />} />
        <TarjetaResumen titulo="Pacientes nuevos" valor={cargando ? "—" : resumen?.pacientes_nuevos_mes ?? 0} descripcion="Este mes" icono={<Users size={20} />} colorIcono="bg-blue-100 text-blue-600" />
        <TarjetaResumen titulo="Médicos activos" valor={cargando ? "—" : resumen?.medicos_activos ?? 0} descripcion="En clínicas activas" icono={<Stethoscope size={20} />} colorIcono="bg-purple-100 text-purple-600" />
        <TarjetaResumen titulo="Clínicas activas" valor={cargando ? "—" : resumen?.clinicas_activas ?? 0} descripcion="Registradas en el sistema" icono={<Building2 size={20} />} colorIcono="bg-green-100 text-green-600" />
      </div>

      {!cargando && !error && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader titulo="Actividad por clínica" subtitulo="Cifras agregadas del día" />
            {!datos?.actividad_por_clinica.length ? (
              <p className="py-6 text-center text-sm text-gray-500">No hay clínicas registradas.</p>
            ) : (
              <div className="space-y-3">
                {datos.actividad_por_clinica.map((clinic) => (
                  <div key={clinic.id_clinica} className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Building2 size={15} className="text-brand-500" />
                      <span className="font-semibold text-brand-800">{clinic.nombre}</span>
                      {!clinic.activa && <span className="text-xs text-gray-500">· Inactiva</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-lg font-bold text-brand-800">{clinic.citas_hoy}</p><p className="text-xs text-gray-500">Citas</p></div>
                      <div><p className="text-lg font-bold text-brand-800">{clinic.pacientes_con_cita_hoy}</p><p className="text-xs text-gray-500">Pacientes con cita</p></div>
                      <div><p className="text-lg font-bold text-brand-800">{clinic.medicos_activos}</p><p className="text-xs text-gray-500">Médicos activos</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader titulo="Citas por estado" subtitulo="Citas con fecha de hoy" />
            <div className="space-y-4">
              {datos?.citas_por_estado.map((item) => {
                const pct = Math.round((item.total / maxEstado) * 100);
                return (
                  <div key={item.estado}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{estadoLegible[item.estado] ?? item.estado}</span>
                      <span className="font-bold text-brand-800">{item.total}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${estadoLegible[item.estado] ?? item.estado}: ${item.total}`}>
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader titulo="Accesos rápidos" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/admin/usuarios" className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-center text-sm font-medium text-brand-800 hover:bg-brand-100">Gestión de usuarios</Link>
          <Link to="/admin/clinicas" className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-center text-sm font-medium text-brand-800 hover:bg-brand-100">Gestión de clínicas</Link>
        </div>
      </Card>
    </div>
  );
}
