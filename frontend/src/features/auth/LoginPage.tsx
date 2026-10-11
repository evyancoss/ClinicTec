import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Stethoscope, AlertCircle } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useDemo } from "../../store/DemoContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errorEmail, setErrorEmail] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const { setAutenticado } = useDemo();
  const navigate = useNavigate();

  // ─── Validación del formulario ────────────────────────────────────────────
  function validar(): boolean {
    let valido = true;
    setErrorEmail("");
    setErrorPassword("");

    if (!email.trim()) {
      setErrorEmail("El correo electrónico es obligatorio.");
      valido = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorEmail("Ingresa un correo electrónico válido.");
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setCargando(true);
    // Simula latencia de red (demostración)
    setTimeout(() => {
      setCargando(false);
      setAutenticado(true);
      navigate("/recepcion/agenda");
    }, 1000);
  }

  function entrarComoDemo() {
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

        {/* Banner de demostración */}
        <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Modo demostración
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Esta interfaz es visual únicamente. No existe autenticación real,
              y ningún dato se guarda ni se envía a ningún servidor.
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
                label="Correo electrónico"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errorEmail}
                autoComplete="email"
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
              {cargando ? "Verificando…" : "Iniciar sesión"}
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
            Ver demostración sin credenciales
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ClinicTec — Versión demo visual · Fase 2
        </p>
      </div>
    </div>
  );
}
