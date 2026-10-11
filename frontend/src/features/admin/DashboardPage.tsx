import {
  CalendarDays,
  Users,
  Stethoscope,
  Building2,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TarjetaResumen } from "../../components/shared/TarjetaResumen";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

// ─── Datos ficticios de demostración ─────────────────────────────────────────
const INDICADORES = [
  {
    titulo: "Citas hoy",
    valor: 42,
    descripcion: "En todas las clínicas",
    tendencia: "subida" as const,
    icono: <CalendarDays size={20} />,
    colorIcono: "bg-brand-100 text-brand-500",
  },
  {
    titulo: "Pacientes nuevos",
    valor: 8,
    descripcion: "Este mes",
    tendencia: "subida" as const,
    icono: <Users size={20} />,
    colorIcono: "bg-blue-100 text-blue-600",
  },
  {
    titulo: "Médicos activos",
    valor: 12,
    descripcion: "En 3 clínicas",
    tendencia: "neutro" as const,
    icono: <Stethoscope size={20} />,
    colorIcono: "bg-purple-100 text-purple-600",
  },
  {
    titulo: "Clínicas activas",
    valor: 3,
    descripcion: "ClinicTec Central, Norte y Sur",
    tendencia: "neutro" as const,
    icono: <Building2 size={20} />,
    colorIcono: "bg-green-100 text-green-600",
  },
];

// Datos ficticios de actividad por clínica
const ACTIVIDAD_CLINICAS = [
  { clinica: "ClinicTec Central", citas: 18, pacientes: 14, medicos: 5 },
  { clinica: "ClinicTec Norte",   citas: 15, pacientes: 11, medicos: 4 },
  { clinica: "ClinicTec Sur",     citas: 9,  pacientes: 7,  medicos: 3 },
];

// Datos ficticios de citas por estado (para gráfica visual simple)
const DISTRIBUCION = [
  { etiqueta: "Programadas", valor: 22, pct: 52, color: "bg-brand-500" },
  { etiqueta: "Atendidas",   valor: 14, pct: 33, color: "bg-green-500" },
  { etiqueta: "Canceladas",  valor: 4,  pct: 10, color: "bg-red-400" },
  { etiqueta: "Reagendadas", valor: 2,  pct: 5,  color: "bg-amber-400" },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sábado, 10 de octubre de 2026
          </p>
        </div>
        <Badge variante="warning">
          Datos ficticios — Solo demostración visual
        </Badge>
      </div>

      {/* Tarjetas de indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {INDICADORES.map((ind) => (
          <TarjetaResumen key={ind.titulo} {...ind} />
        ))}
      </div>

      {/* Fila: actividad por clínica + distribución de citas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad por clínica */}
        <Card>
          <CardHeader
            titulo="Actividad por clínica"
            subtitulo="Resumen del día de hoy"
          />
          <div className="space-y-4">
            {ACTIVIDAD_CLINICAS.map((c) => (
              <div key={c.clinica} className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={15} className="text-brand-500" />
                  <span className="text-sm font-semibold text-brand-800">
                    {c.clinica}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-brand-800">{c.citas}</p>
                    <p className="text-xs text-gray-500">Citas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-brand-800">{c.pacientes}</p>
                    <p className="text-xs text-gray-500">Pacientes</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-brand-800">{c.medicos}</p>
                    <p className="text-xs text-gray-500">Médicos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribución de citas */}
        <Card>
          <CardHeader
            titulo="Distribución de citas"
            subtitulo="Todas las clínicas · hoy"
          />
          <div className="space-y-4">
            {DISTRIBUCION.map((d) => (
              <div key={d.etiqueta}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    {d.etiqueta}
                  </span>
                  <span className="text-sm font-bold text-brand-800">
                    {d.valor}
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      ({d.pct}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 bg-brand-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={d.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.etiqueta}: ${d.pct}%`}>
                  <div
                    className={`h-full rounded-full ${d.color} transition-all duration-500`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <BarChart2 size={13} className="text-amber-600" aria-hidden="true" />
              <span className="text-xs text-amber-700">
                Gráfica de demostración — no representa datos reales
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader titulo="Accesos rápidos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { etiqueta: "Gestión de usuarios", icono: <Users size={20} />, ruta: "/admin/usuarios" },
            { etiqueta: "Gestión de clínicas", icono: <Building2 size={20} />, ruta: "/admin/clinicas" },
            { etiqueta: "Indicadores del mes", icono: <TrendingUp size={20} />, ruta: null },
          ].map((acc) =>
            acc.ruta ? (
              <Link
                key={acc.etiqueta}
                to={acc.ruta}
                className="flex flex-col items-center gap-2 p-4 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div className="text-brand-500">{acc.icono}</div>
                <span className="text-sm font-medium text-brand-800">{acc.etiqueta}</span>
              </Link>
            ) : (
              <button
                key={acc.etiqueta}
                onClick={() => {}}
                disabled
                className="flex flex-col items-center gap-2 p-4 bg-brand-50 border border-brand-200 rounded-xl text-center opacity-50 cursor-not-allowed"
                title="Disponible en una fase posterior"
              >
                <div className="text-brand-500">{acc.icono}</div>
                <span className="text-sm font-medium text-brand-800">{acc.etiqueta}</span>
                <span className="text-xs text-gray-400">(próximamente)</span>
              </button>
            )
          )}
        </div>
      </Card>
    </div>
  );
}
