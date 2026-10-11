import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { AgendaPage } from "../features/recepcion/AgendaPage";
import { PacientesPage } from "../features/recepcion/PacientesPage";
import { MiAgendaPage } from "../features/medico/MiAgendaPage";
import { MisPacientesPage } from "../features/medico/MisPacientesPage";
import { DashboardPage } from "../features/admin/DashboardPage";
import { UsuariosPage } from "../features/admin/UsuariosPage";
import { ClinicasPage } from "../features/admin/ClinicasPage";
import { useDemo } from "../store/demo-context";
import type { ReactNode } from "react";

// ─── Guard visual de demostración ────────────────────────────────────────────
// No es un mecanismo de seguridad real.
// En producción, la autenticación la valida el backend con JWT.
function RutaProtegidaDemo({ children }: { children: ReactNode }) {
  const { autenticado } = useDemo();
  if (!autenticado) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Layout autenticado (demo) */}
        <Route
          path="/"
          element={
            <RutaProtegidaDemo>
              <AppLayout />
            </RutaProtegidaDemo>
          }
        >
          {/* Redirección raíz */}
          <Route index element={<Navigate to="/recepcion/agenda" replace />} />

          {/* Recepción */}
          <Route path="recepcion/agenda"    element={<AgendaPage />} />
          <Route path="recepcion/pacientes" element={<PacientesPage />} />

          {/* Médico */}
          <Route path="medico/agenda"    element={<MiAgendaPage />} />
          <Route path="medico/pacientes" element={<MisPacientesPage />} />

          {/* Administrador */}
          <Route path="admin/dashboard" element={<DashboardPage />} />
          <Route path="admin/usuarios"  element={<UsuariosPage />} />
          <Route path="admin/clinicas"  element={<ClinicasPage />} />
        </Route>

        {/* Ruta no encontrada */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
