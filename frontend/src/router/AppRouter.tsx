import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
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
import { rolVisualDeCuenta, rutaInicioDeRol, type Rol } from "../types";

function PantallaCargando() {
  return (
    <main className="flex min-h-screen items-center justify-center" role="status">
      Verificando sesión…
    </main>
  );
}

function obtenerRolActual(
  modoDemo: boolean,
  rolActivo: Rol,
  rolCuenta: "administrador" | "recepcion" | "medicos" | undefined,
): Rol | null {
  if (modoDemo) return rolActivo;
  return rolCuenta ? rolVisualDeCuenta(rolCuenta) : null;
}

function RutaAutenticada({ children }: { children: ReactNode }) {
  const { autenticacionCargando, autenticado, modoDemo, rolActivo, usuarioAutenticado } = useDemo();
  if (autenticacionCargando) return <PantallaCargando />;
  if (!autenticado) return <Navigate to="/login" replace />;
  if (!obtenerRolActual(modoDemo, rolActivo, usuarioAutenticado?.rol)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RutaPorRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { autenticacionCargando, autenticado, modoDemo, rolActivo, usuarioAutenticado } = useDemo();
  if (autenticacionCargando) return <PantallaCargando />;
  if (!autenticado) return <Navigate to="/login" replace />;

  const rol = obtenerRolActual(modoDemo, rolActivo, usuarioAutenticado?.rol);
  if (!rol) return <Navigate to="/login" replace />;
  if (!roles.includes(rol)) return <Navigate to={rutaInicioDeRol(rol)} replace />;
  return <>{children}</>;
}

function RutaLogin() {
  const { autenticacionCargando, autenticado, modoDemo, rolActivo, usuarioAutenticado } = useDemo();
  if (autenticacionCargando) return <PantallaCargando />;
  if (autenticado) {
    const rol = obtenerRolActual(modoDemo, rolActivo, usuarioAutenticado?.rol);
    if (rol) return <Navigate to={rutaInicioDeRol(rol)} replace />;
  }
  return <LoginPage />;
}

function RutaInicial() {
  const { autenticado, modoDemo, rolActivo, usuarioAutenticado } = useDemo();
  const rol = autenticado
    ? obtenerRolActual(modoDemo, rolActivo, usuarioAutenticado?.rol)
    : null;
  return <Navigate to={rol ? rutaInicioDeRol(rol) : "/login"} replace />;
}

function RutaNoEncontrada() {
  const { autenticacionCargando, autenticado, modoDemo, rolActivo, usuarioAutenticado } = useDemo();
  if (autenticacionCargando) return <PantallaCargando />;
  const rol = autenticado
    ? obtenerRolActual(modoDemo, rolActivo, usuarioAutenticado?.rol)
    : null;
  return <Navigate to={rol ? rutaInicioDeRol(rol) : "/login"} replace />;
}

export function RutasClinicTec() {
  return (
    <Routes>
      <Route path="/login" element={<RutaLogin />} />
      <Route
        path="/"
        element={
          <RutaAutenticada>
            <AppLayout />
          </RutaAutenticada>
        }
      >
        <Route index element={<RutaInicial />} />
        <Route path="recepcion/agenda" element={
          <RutaPorRol roles={["recepcion"]}><AgendaPage /></RutaPorRol>
        } />
        <Route path="recepcion/pacientes" element={
          <RutaPorRol roles={["administrador", "recepcion"]}><PacientesPage /></RutaPorRol>
        } />
        <Route path="medico/agenda" element={
          <RutaPorRol roles={["medico"]}><MiAgendaPage /></RutaPorRol>
        } />
        <Route path="medico/pacientes" element={
          <RutaPorRol roles={["medico"]}><MisPacientesPage /></RutaPorRol>
        } />
        <Route path="admin/dashboard" element={
          <RutaPorRol roles={["administrador"]}><DashboardPage /></RutaPorRol>
        } />
        <Route path="admin/usuarios" element={
          <RutaPorRol roles={["administrador"]}><UsuariosPage /></RutaPorRol>
        } />
        <Route path="admin/clinicas" element={
          <RutaPorRol roles={["administrador"]}><ClinicasPage /></RutaPorRol>
        } />
      </Route>
      <Route path="*" element={<RutaNoEncontrada />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RutasClinicTec />
    </BrowserRouter>
  );
}
