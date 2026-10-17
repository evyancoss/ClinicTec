import { useEffect, useState } from "react";
import { citasService } from "../lib/citasService";
import type { Cita } from "../types";

const POR_PAGINA = 20;

function fechaLocalActual(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useAgendaCitas(_modoDemo?: boolean, _nombreMedicoDemo?: string) {
  // Los parámetros opcionales se conservan temporalmente por compatibilidad con
  // llamadas existentes; las agendas consultan siempre la API.
  void _modoDemo;
  void _nombreMedicoDemo;
  const [fecha, setFecha] = useState(fechaLocalActual);
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
  }, [fecha, pagina, version]);

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
    pagina,
    paginas,
    recargarCitas,
    setPagina,
    total,
  };
}
