import { useEffect, useState, type FormEvent } from "react";
import { Edit, UserPlus } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import {
  usuariosService,
  type AltaUsuario,
  type ClinicaOpcion,
  type RolCuenta,
  type UsuarioSistema,
} from "../../lib/usuariosService";

interface BorradorUsuario {
  nombre: string;
  ape_paterno: string;
  ape_materno: string;
  usuario: string;
  contrasena: string;
  rol: RolCuenta;
  id_clinica: string;
  especialidad: string;
  cedula_profesional: string;
  telefono: string;
  correo: string;
}

const BORRADOR_VACIO: BorradorUsuario = {
  nombre: "",
  ape_paterno: "",
  ape_materno: "",
  usuario: "",
  contrasena: "",
  rol: "recepcion",
  id_clinica: "",
  especialidad: "",
  cedula_profesional: "",
  telefono: "",
  correo: "",
};

const ETIQUETAS_ROL: Record<RolCuenta, string> = {
  administrador: "Administrador",
  recepcion: "Recepción",
  medicos: "Médico",
};

const VARIANTES_ROL: Record<RolCuenta, "default" | "info" | "success"> = {
  administrador: "default",
  recepcion: "info",
  medicos: "success",
};

const CAMPO =
  "w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500";

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [clinicas, setClinicas] = useState<ClinicaOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistema | null>(null);
  const [borradorEdicion, setBorradorEdicion] = useState({
    nombre: "",
    ape_paterno: "",
    ape_materno: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const [borrador, setBorrador] = useState(BORRADOR_VACIO);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      usuariosService.listar(),
      usuariosService.listarClinicas(),
    ])
      .then(([listaUsuarios, listaClinicas]) => {
        if (!vigente) return;
        setUsuarios(listaUsuarios);
        setClinicas(listaClinicas);
        setErrorCarga(null);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los usuarios.",
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [recarga]);

  const cargandoActual = cargando;
  const errorActual = errorCarga;

  function abrirFormulario() {
    setBorrador(BORRADOR_VACIO);
    setErrorFormulario(null);
    setConfirmacion(null);
    setModalAbierto(true);
  }

  function abrirEdicion(usuario: UsuarioSistema) {
    setUsuarioEditando(usuario);
    setBorradorEdicion({
      nombre: usuario.nombre,
      ape_paterno: usuario.ape_paterno,
      ape_materno: usuario.ape_materno,
    });
    setErrorFormulario(null);
    setConfirmacion(null);
    setModalEdicionAbierto(true);
  }

  function cerrarFormulario() {
    if (guardando) return;
    setModalAbierto(false);
    setErrorFormulario(null);
  }

  function actualizarCampo<K extends keyof BorradorUsuario>(
    campo: K,
    valor: BorradorUsuario[K],
  ) {
    setBorrador((actual) => ({ ...actual, [campo]: valor }));
  }

  async function registrarUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorFormulario(null);

    const datos: AltaUsuario = {
      nombre: borrador.nombre.trim(),
      ape_paterno: borrador.ape_paterno.trim(),
      ape_materno: borrador.ape_materno.trim(),
      usuario: borrador.usuario.trim(),
      contrasena: borrador.contrasena,
      rol: borrador.rol,
    };

    if (borrador.rol === "medicos") {
      const idClinica = Number(borrador.id_clinica);
      if (!Number.isInteger(idClinica) || idClinica < 1) {
        setErrorFormulario("Selecciona una clínica activa.");
        return;
      }
      datos.id_clinica = idClinica;
      datos.especialidad = borrador.especialidad.trim();
      datos.cedula_profesional = borrador.cedula_profesional.trim();
      if (borrador.telefono.trim()) datos.telefono = borrador.telefono.trim();
      if (borrador.correo.trim()) datos.correo = borrador.correo.trim();
    }

    setGuardando(true);
    try {
      await usuariosService.crear(datos);
      setModalAbierto(false);
      setBorrador(BORRADOR_VACIO);
      setConfirmacion("El usuario se registró correctamente.");
      setCargando(true);
      setRecarga((actual) => actual + 1);
    } catch (error: unknown) {
      setErrorFormulario(
        error instanceof Error ? error.message : "No se pudo registrar el usuario.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuarioEditando) return;
    setErrorFormulario(null);
    setGuardando(true);

    try {
      const actualizado = await usuariosService.editar(
        usuarioEditando.id_usuario,
        {
          nombre: borradorEdicion.nombre.trim(),
          ape_paterno: borradorEdicion.ape_paterno.trim(),
          ape_materno: borradorEdicion.ape_materno.trim(),
        },
      );
      setUsuarios((actuales) =>
        actuales.map((usuario) =>
          usuario.id_usuario === actualizado.id_usuario ? actualizado : usuario,
        ),
      );
      setModalEdicionAbierto(false);
      setUsuarioEditando(null);
      setConfirmacion("Los datos del usuario se actualizaron correctamente.");
    } catch (error: unknown) {
      setErrorFormulario(
        error instanceof Error ? error.message : "No se pudieron actualizar los datos.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Gestión de usuarios</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {cargandoActual
              ? "Cargando usuarios…"
              : `${usuarios.length} usuarios registrados`}
          </p>
        </div>
        <Button
          variante="primary"
          icono={<UserPlus size={16} />}
          onClick={abrirFormulario}
        >
          Nuevo usuario
        </Button>
      </div>

      <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        Se pueden editar nombre y apellidos; en cuentas médicas también se actualizan coordinadamente en el perfil profesional. El nombre de usuario, el rol y la contraseña no se modifican aquí.
      </p>

      {confirmacion && (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {confirmacion}
        </p>
      )}
      {errorActual && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorActual}
          <Button
            className="ml-3"
            variante="secondary"
            tamaño="sm"
            onClick={() => {
              setCargando(true);
              setRecarga((actual) => actual + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      <Card padding={false}>
        <CardHeader titulo="Usuarios del sistema" subtitulo="Cuentas registradas en ClinicTec" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Lista de usuarios">
            <thead>
              <tr className="bg-brand-100 text-brand-800">
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="hidden px-4 py-3 text-left font-semibold md:table-cell">Usuario</th>
                <th className="px-4 py-3 text-left font-semibold">Rol</th>
                <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Clínica / especialidad</th>
                <th className="px-4 py-3 text-left font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargandoActual && (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={5}>Cargando usuarios…</td></tr>
              )}
              {!cargandoActual && !errorActual && usuarios.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={5}>No hay usuarios registrados.</td></tr>
              )}
              {!cargandoActual && usuarios.map((usuario, index) => (
                <tr
                  key={usuario.id_usuario}
                  className={`border-t border-brand-200 transition-colors hover:bg-brand-100 ${index % 2 === 0 ? "bg-white" : "bg-brand-50"}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">
                      {[usuario.nombre, usuario.ape_paterno, usuario.ape_materno].filter(Boolean).join(" ")}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{usuario.usuario}</td>
                  <td className="px-4 py-3">
                    <Badge variante={VARIANTES_ROL[usuario.rol]}>{ETIQUETAS_ROL[usuario.rol]}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                    {usuario.medico
                      ? `${usuario.medico.nombre_clinica} · ${usuario.medico.especialidad}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variante="ghost"
                      tamaño="sm"
                      icono={<Edit size={14} />}
                      aria-label={`Editar ${usuario.nombre}`}
                      title="Editar nombre y apellidos"
                      onClick={() => abrirEdicion(usuario)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal abierto={modalAbierto} titulo="Registrar usuario" onCerrar={cerrarFormulario} ancho="max-w-2xl">
        <form className="space-y-4" onSubmit={registrarUsuario}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Nombre
              <input className={CAMPO} value={borrador.nombre} onChange={(e) => actualizarCampo("nombre", e.target.value)} maxLength={100} required />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Apellido paterno
              <input className={CAMPO} value={borrador.ape_paterno} onChange={(e) => actualizarCampo("ape_paterno", e.target.value)} maxLength={100} required />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Apellido materno
              <input className={CAMPO} value={borrador.ape_materno} onChange={(e) => actualizarCampo("ape_materno", e.target.value)} maxLength={100} required />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Nombre de usuario
              <input className={CAMPO} autoComplete="username" value={borrador.usuario} onChange={(e) => actualizarCampo("usuario", e.target.value)} maxLength={100} required />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Contraseña (mínimo 12 caracteres)
              <input className={CAMPO} type="password" autoComplete="new-password" value={borrador.contrasena} onChange={(e) => actualizarCampo("contrasena", e.target.value)} minLength={12} maxLength={128} required />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Rol
              <select className={CAMPO} value={borrador.rol} onChange={(e) => actualizarCampo("rol", e.target.value as RolCuenta)}>
                <option value="recepcion">Recepción</option>
                <option value="medicos">Médico</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>
          </div>

          {borrador.rol === "medicos" && (
            <fieldset className="space-y-4 rounded-lg border border-brand-200 p-4">
              <legend className="px-1 text-sm font-semibold text-brand-800">Perfil médico</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Clínica
                  <select className={CAMPO} value={borrador.id_clinica} onChange={(e) => actualizarCampo("id_clinica", e.target.value)} required>
                    <option value="">Selecciona una clínica</option>
                    {clinicas.map((clinica) => (
                      <option key={clinica.id_clinica} value={clinica.id_clinica}>{clinica.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Especialidad
                  <input className={CAMPO} value={borrador.especialidad} onChange={(e) => actualizarCampo("especialidad", e.target.value)} maxLength={100} required />
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Cédula profesional
                  <input className={CAMPO} value={borrador.cedula_profesional} onChange={(e) => actualizarCampo("cedula_profesional", e.target.value)} maxLength={50} required />
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Teléfono (opcional)
                  <input className={CAMPO} type="tel" value={borrador.telefono} onChange={(e) => actualizarCampo("telefono", e.target.value)} maxLength={20} />
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700 sm:col-span-2">
                  Correo (opcional)
                  <input className={CAMPO} type="email" value={borrador.correo} onChange={(e) => actualizarCampo("correo", e.target.value)} maxLength={100} />
                </label>
              </div>
            </fieldset>
          )}

          {errorFormulario && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorFormulario}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variante="secondary" onClick={cerrarFormulario} disabled={guardando}>Cancelar</Button>
            <Button type="submit" cargando={guardando}>Registrar usuario</Button>
          </div>
        </form>
      </Modal>
      <Modal
        abierto={modalEdicionAbierto}
        titulo="Editar usuario"
        onCerrar={() => {
          if (!guardando) setModalEdicionAbierto(false);
        }}
      >
        <form className="space-y-4" onSubmit={guardarEdicion}>
          <p className="text-sm text-gray-600">
            Solo se actualizan nombre y apellidos. El nombre de usuario, rol y contraseña permanecen sin cambios.
          </p>
          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Nombre
            <input
              className={CAMPO}
              value={borradorEdicion.nombre}
              onChange={(evento) => setBorradorEdicion((actual) => ({
                ...actual,
                nombre: evento.target.value,
              }))}
              maxLength={100}
              required
            />
          </label>
          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Apellido paterno
            <input
              className={CAMPO}
              value={borradorEdicion.ape_paterno}
              onChange={(evento) => setBorradorEdicion((actual) => ({
                ...actual,
                ape_paterno: evento.target.value,
              }))}
              maxLength={100}
              required
            />
          </label>
          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Apellido materno
            <input
              className={CAMPO}
              value={borradorEdicion.ape_materno}
              onChange={(evento) => setBorradorEdicion((actual) => ({
                ...actual,
                ape_materno: evento.target.value,
              }))}
              maxLength={100}
              required
            />
          </label>
          {errorFormulario && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorFormulario}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variante="secondary"
              onClick={() => setModalEdicionAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
