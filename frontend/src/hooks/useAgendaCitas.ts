import { useEffect, useState } from "react";
import { CITAS_DEMO, PROXIMAS_CITAS_DEMO } from "../utils/datosDemo";
import { citasService } from "../lib/citasService";
import type { Cita } from "../types";

const POR_PAGINA = 20;
const FECHA_DEMO_INICIAL = "2026-10-10";

function fechaLocalActual(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useAgendaCitas(modoDemo: boolean, nombreMedicoDemo?: string) {
  const [fecha, setFecha] = useState(() =>
    modoDemo ? FECHA_DEMO_INICIAL : fechaLocalActual()
  );
  const [pagina, setPagina] = useState(1);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError(null);

      if (modoDemo) {
        const todasLasCitasDemo = [...CITAS_DEMO, ...PROXIMAS_CITAS_DEMO];
        const citasDeFecha = todasLasCitasDemo.filter((cita) =>
          cita.fecha === fecha
          && (!nombreMedicoDemo || cita.nombre_medico === nombreMedicoDemo)
        );
        const inicio = (pagina - 1) * POR_PAGINA;
        const citasPagina = citasDeFecha.slice(inicio, inicio + POR_PAGINA);
        if (vigente) {
          setCitas(citasPagina);
          setTotal(citasDeFecha.length);
          setPaginas(Math.ceil(citasDeFecha.length / POR_PAGINA));
          setCargando(false);
        }
        return;
      }

      try {
        const respuesta = await citasService.listar(fecha, pagina, POR_PAGINA);
        if (!vigente) return;
        if (respuesta.error || respuesta.data === null) {
          setCitas([]);
          setTotal(0);
          setPaginas(0);
          setError(respuesta.error || "No se recibió información de la agenda.");
          return;
        }
        setCitas(respuesta.data.citas);
        setTotal(respuesta.data.paginacion.total);
        setPaginas(respuesta.data.paginacion.paginas);
      } catch (errorDesconocido) {
        if (!vigente) return;
        setCitas([]);
        setTotal(0);
        setPaginas(0);
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : "No fue posible cargar la agenda."
        );
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void cargar();
    return () => {
      vigente = false;
    };
  }, [fecha, modoDemo, nombreMedicoDemo, pagina, version]);

  function cambiarFecha(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setPagina(1);
  }

  function recargarCitas() {
    setVersion((actual) => actual + 1);
  }

  return {
    citas,
    cargando,
    cambiarFecha,
    error,
    fecha,
    modoDemo,
    pagina,
    paginas,
    recargarCitas,
    setPagina,
    total,
  };
}
