/**
 * hooks/useApi.ts
 * Hook genérico para llamadas a la API con estado de carga y error.
 */

import { useState, useCallback } from "react";
import type { ApiResponse } from "../lib/api";

interface EstadoApi<T> {
  datos:     T | null;
  cargando:  boolean;
  error:     string | null;
}

export function useApi<T>() {
  const [estado, setEstado] = useState<EstadoApi<T>>({
    datos:    null,
    cargando: false,
    error:    null,
  });

  const ejecutar = useCallback(
    async (llamada: () => Promise<ApiResponse<T>>): Promise<T | null> => {
      setEstado({ datos: null, cargando: true, error: null });
      try {
        const resp = await llamada();
        if (resp.error || resp.data === null) {
          const msg = typeof resp.error === "string"
            ? resp.error
            : "Error inesperado.";
          setEstado({ datos: null, cargando: false, error: msg });
          return null;
        }
        setEstado({ datos: resp.data, cargando: false, error: null });
        return resp.data;
      } catch {
        setEstado({
          datos:    null,
          cargando: false,
          error:    "No se pudo conectar con el servidor.",
        });
        return null;
      }
    },
    []
  );

  return { ...estado, ejecutar };
}
