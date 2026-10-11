import { useState } from "react";
import { UserPlus, ToggleLeft, ToggleRight, Edit } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ToastDemo } from "../../components/ui/ToastDemo";

type RolUsuario = "administrador" | "recepcion" | "medico";

interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  clinica: string;
  activo: boolean;
}

const USUARIOS_DEMO: UsuarioAdmin[] = [
  { id: 1, nombre: "Ana García",     correo: "ana@clinictec.demo",    rol: "administrador", clinica: "ClinicTec Central", activo: true },
  { id: 2, nombre: "Carlos Méndez",  correo: "carlos@clinictec.demo", rol: "recepcion",     clinica: "ClinicTec Norte",   activo: true },
  { id: 3, nombre: "Dra. Laura Vega",correo: "laura@clinictec.demo",  rol: "medico",        clinica: "ClinicTec Norte",   activo: true },
  { id: 4, nombre: "Dr. Marcos Torres",correo:"marcos@clinictec.demo",rol: "medico",        clinica: "ClinicTec Central", activo: true },
  { id: 5, nombre: "Beatriz Soto",   correo: "beatriz@clinictec.demo",rol: "recepcion",     clinica: "ClinicTec Sur",     activo: false },
];

const etiquetasRol: Record<RolUsuario, string> = {
  administrador: "Administrador",
  recepcion:     "Recepción",
  medico:        "Médico",
};

const variantesRol: Record<RolUsuario, "default" | "info" | "success"> = {
  administrador: "default",
  recepcion:     "info",
  medico:        "success",
};

export function UsuariosPage() {
  const [toast, setToast] = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Gestión de usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {USUARIOS_DEMO.length} usuarios registrados
          </p>
        </div>
        <Button
          variante="primary"
          icono={<UserPlus size={16} />}
          onClick={() =>
            mostrarToast("DEMO: En producción, esto abriría el formulario de alta de usuario.")
          }
        >
          Nuevo usuario
        </Button>
      </div>

      <Card padding={false}>
        <CardHeader
          titulo="Usuarios del sistema"
          subtitulo="Todos los roles y clínicas"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Lista de usuarios">
            <thead>
              <tr className="bg-brand-100 text-brand-800">
                <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Correo</th>
                <th className="text-left px-4 py-3 font-semibold">Rol</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Clínica</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="text-left px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {USUARIOS_DEMO.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-t border-brand-200 hover:bg-brand-100 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-brand-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold select-none flex-shrink-0">
                        {u.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className="font-medium text-gray-800">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                    {u.correo}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variante={variantesRol[u.rol]}>
                      {etiquetasRol[u.rol]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                    {u.clinica}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variante={u.activo ? "success" : "default"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variante="ghost"
                        tamaño="sm"
                        icono={<Edit size={14} />}
                        onClick={() =>
                          mostrarToast("DEMO: En producción, esto abriría la edición del usuario.")
                        }
                        aria-label={`Editar ${u.nombre}`}
                      />
                      <Button
                        variante="ghost"
                        tamaño="sm"
                        icono={
                          u.activo ? (
                            <ToggleRight size={16} className="text-brand-500" />
                          ) : (
                            <ToggleLeft size={16} className="text-gray-400" />
                          )
                        }
                        onClick={() =>
                          mostrarToast(
                            `DEMO: En producción, esto ${u.activo ? "desactivaría" : "reactivaría"} la cuenta de ${u.nombre}.`
                          )
                        }
                        aria-label={`${u.activo ? "Desactivar" : "Reactivar"} ${u.nombre}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <ToastDemo mensaje={toast} tipo="info" onCerrar={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
