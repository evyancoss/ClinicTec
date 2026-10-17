import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, Phone, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { adminService, type ClinicaAPI } from "../../lib/adminService";

export function ClinicasPage() {
  const [clinicas, setClinicas] = useState<ClinicaAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setClinicas(await adminService.clinicas());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las clínicas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    adminService.clinicas()
      .then((resultado) => { if (vigente) setClinicas(resultado); })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : "No se pudieron cargar las clínicas.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const activas = clinicas.filter((clinic) => clinic.activa).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Clínicas</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {cargando ? "Cargando…" : `${clinicas.length} registradas · ${activas} activas`}
          </p>
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
      {cargando && !clinicas.length && <p role="status" className="py-10 text-center text-sm text-gray-500">Cargando clínicas…</p>}
      {!cargando && !error && clinicas.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No hay clínicas registradas.</p>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy={cargando}>
        {clinicas.map((clinic) => (
          <Card key={clinic.id_clinica} className={!clinic.activa ? "opacity-70" : ""}>
            <div className="mb-3 flex items-start justify-between">
              <div className="rounded-xl bg-brand-100 p-2.5"><Building2 size={22} className="text-brand-500" /></div>
              <Badge variante={clinic.activa ? "success" : "default"}>{clinic.activa ? "Activa" : "Inactiva"}</Badge>
            </div>
            <h2 className="mb-3 text-base font-bold text-brand-800">{clinic.nombre}</h2>
            <div className="mb-4 space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-600"><MapPin size={13} className="mt-0.5 shrink-0 text-brand-500" /><span>{clinic.direccion || "Dirección no registrada"}</span></div>
              {clinic.telefono && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={13} className="text-brand-500" /><span>{clinic.telefono}</span></div>}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-brand-100 pt-4 text-center">
              <div className="rounded-lg bg-brand-50 p-2.5"><p className="text-lg font-bold text-brand-800">{clinic.medicos_activos}</p><p className="text-xs text-gray-500">Médicos activos</p></div>
              <div className="rounded-lg bg-brand-50 p-2.5"><p className="text-lg font-bold text-brand-800">{clinic.pacientes_con_cita}</p><p className="text-xs text-gray-500">Pacientes atendidos</p></div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-gray-500">Los conteos se calculan desde citas registradas. La creación y edición de clínicas todavía no está habilitada.</p>
    </div>
  );
}
