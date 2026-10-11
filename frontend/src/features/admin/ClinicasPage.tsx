import { useState } from "react";
import { Building2, Plus, Edit, ToggleRight, ToggleLeft, MapPin, Phone } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ToastDemo } from "../../components/ui/ToastDemo";

interface Clinica {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  medicos: number;
  pacientes: number;
  activa: boolean;
}

const CLINICAS_DEMO: Clinica[] = [
  {
    id: 1,
    nombre: "ClinicTec Central",
    direccion: "Av. Reforma 1234, Col. Juárez, CDMX",
    telefono: "55 1234-5678",
    medicos: 5,
    pacientes: 210,
    activa: true,
  },
  {
    id: 2,
    nombre: "ClinicTec Norte",
    direccion: "Blvd. Manuel Ávila Camacho 56, Naucalpan",
    telefono: "55 8765-4321",
    medicos: 4,
    pacientes: 178,
    activa: true,
  },
  {
    id: 3,
    nombre: "ClinicTec Sur",
    direccion: "Calz. de Tlalpan 890, Col. Portales",
    telefono: "55 2345-6789",
    medicos: 3,
    pacientes: 95,
    activa: false,
  },
];

export function ClinicasPage() {
  const [toast, setToast] = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Gestión de clínicas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {CLINICAS_DEMO.length} clínicas registradas
          </p>
        </div>
        <Button
          variante="primary"
          icono={<Plus size={16} />}
          onClick={() =>
            mostrarToast("DEMO: En producción, esto abriría el formulario de nueva clínica.")
          }
        >
          Nueva clínica
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {CLINICAS_DEMO.map((c) => (
          <Card key={c.id} className={!c.activa ? "opacity-70" : ""}>
            <div className="flex items-start justify-between mb-3">
              <div className="bg-brand-100 rounded-xl p-2.5">
                <Building2 size={22} className="text-brand-500" />
              </div>
              <Badge variante={c.activa ? "success" : "default"}>
                {c.activa ? "Activa" : "Inactiva"}
              </Badge>
            </div>

            <h3 className="text-base font-bold text-brand-800 mb-3">{c.nombre}</h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={13} className="mt-0.5 text-brand-500 flex-shrink-0" />
                <span>{c.direccion}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={13} className="text-brand-500" />
                <span>{c.telefono}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-brand-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-brand-800">{c.medicos}</p>
                <p className="text-xs text-gray-500">Médicos</p>
              </div>
              <div className="bg-brand-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-brand-800">{c.pacientes}</p>
                <p className="text-xs text-gray-500">Pacientes</p>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-brand-100">
              <Button
                variante="secondary"
                tamaño="sm"
                icono={<Edit size={13} />}
                className="flex-1"
                onClick={() =>
                  mostrarToast("DEMO: En producción, esto abriría la edición de la clínica.")
                }
              >
                Editar
              </Button>
              <Button
                variante="ghost"
                tamaño="sm"
                icono={
                  c.activa ? (
                    <ToggleRight size={16} className="text-brand-500" />
                  ) : (
                    <ToggleLeft size={16} className="text-gray-400" />
                  )
                }
                onClick={() =>
                  mostrarToast(
                    `DEMO: En producción, esto ${c.activa ? "desactivaría" : "reactivaría"} ${c.nombre}.`
                  )
                }
                aria-label={c.activa ? `Desactivar ${c.nombre}` : `Reactivar ${c.nombre}`}
              />
            </div>
          </Card>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <ToastDemo mensaje={toast} tipo="info" onCerrar={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
