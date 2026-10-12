import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Stethoscope, AlertCircle } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useDemo } from "../../store/demo-context";
import { authService } from "../../lib/authService";
import { setAccessToken } from "../../lib/api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errorEmail, setErrorEmail] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const {
    setAutenticado,
    setRolActivo,
    setModoDemo,
    setUsuarioAutenticado,
  } = useDemo();
  const navigate = useNavigate();

  // ─── Validación del formulario ────────────────────────────────────────────
  function validar(): boolean {
    let valido = true;
    setErrorEmail("");
    setErrorPassword("");

    if (!email.trim()) {
      setErrorEmail("El usuario es obligatorio.");
      valido = false;
    }

    if (!password) {
      setErrorPassword("La contraseña es obligatoria.");
      valido = false;
    } else if (password.length < 4) {
      setErrorPassword("La contraseña debe tener al menos 4 caracteres.");
      valido = false;
    }

    return valido;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setCargando(true);
    const respuesta = await authService.iniciarSesion(email.trim(), password);
    setCargando(false);
    if (respuesta.error || !respuesta.data) {
      setErrorPassword(respuesta.error ?? "No fue posible iniciar sesión.");
      return;
    }
    setAccessToken(respuesta.data.access_token);
    setUsuarioAutenticado(respuesta.data.perfil);
    setModoDemo(false);
    const rol = respuesta.data.perfil.rol === "medicos"
      ? "medico"
      : respuesta.data.perfil.rol;
    setRolActivo(rol);
    setAutenticado(true);
    navigate(rol === "medico" ? "/medico/pacientes" : "/recepcion/pacientes");
  }

  function entrarComoDemo() {
    setAccessToken(null);
    setUsuarioAutenticado(null);
    setModoDemo(true);
    setRolActivo("recepcion");
    setAutenticado(true);
    navigate("/recepcion/agenda");
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-800 rounded-2xl p-4 mb-3 shadow-md">
            <Stethoscope size={36} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-brand-800">ClinicTec</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de clínicas médicas
          </p>
        </div>

        {/* Acceso a la API */}
        <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Acceso seguro
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Inicia sesión con tu usuario de ClinicTec. El acceso y los permisos
              se validan en la API.
            </p>
          </div>
        </div>

        {/* Tarjeta del formulario */}
        <div className="bg-white border border-brand-200 rounded-2xl shadow-sm p-8">
          <h2 className="text-lg font-semibold text-brand-800 mb-6">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} noValidate aria-label="Formulario de inicio de sesión">
            <div className="space-y-4">
              <Input
                label="Usuario"
                type="text"
                placeholder="usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errorEmail}
                autoComplete="username"
                autoFocus
              />

              <div className="flex flex-col gap-1">
                <Input
                  label="Contraseña"
                  type={verPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errorPassword}
                  autoComplete="current-password"
                  iconoDerecho={
                    <button
                      type="button"
                      onClick={() => setVerPassword((v) => !v)}
                      className="text-gray-400 hover:text-brand-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                      aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              variante="primary"
              tamaño="lg"
              cargando={cargando}
              className="w-full mt-6"
            >
              {cargando ? "Verificando…" : "Registrarse"}
            </Button>
          </form>

          {/* Separador */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-brand-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 border-t border-brand-200" />
          </div>

          {/* Acceso rápido a la demo */}
          <Button
            variante="secondary"
            tamaño="lg"
            className="w-full"
            onClick={entrarComoDemo}
          >
            Registrarse
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ClinicTec · Autenticación JWT · Fase 5
        </p>
      </div>
    </div>
  );
}
