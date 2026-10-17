import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DemoContext, USUARIOS_DEMO } from "../store/demo-context";
import { DemoProvider } from "../store/DemoContext";
import type { DemoContextType, PerfilAutenticado, Rol } from "../types";
import { RutasClinicTec } from "./AppRouter";

const restaurarSesion = vi.hoisted(() => vi.fn());

vi.mock("../lib/authService", () => ({
  authService: {
    restaurarSesion,
  },
}));

vi.mock("../features/admin/DashboardPage", () => ({
  DashboardPage: () => <div>Contenido Dashboard administrador</div>,
}));
vi.mock("../features/admin/UsuariosPage", () => ({
  UsuariosPage: () => <div>Contenido Usuarios</div>,
}));
vi.mock("../features/admin/ClinicasPage", () => ({
  ClinicasPage: () => <div>Contenido Clínicas</div>,
}));
vi.mock("../features/recepcion/AgendaPage", () => ({
  AgendaPage: () => <div>Contenido Agenda recepción</div>,
}));
vi.mock("../features/recepcion/PacientesPage", () => ({
  PacientesPage: () => <div>Contenido Pacientes recepción</div>,
}));
vi.mock("../features/medico/MiAgendaPage", () => ({
  MiAgendaPage: () => <div>Contenido Agenda médico</div>,
}));
vi.mock("../features/medico/MisPacientesPage", () => ({
  MisPacientesPage: () => <div>Contenido Pacientes médico</div>,
}));

function perfil(rol: PerfilAutenticado["rol"]): PerfilAutenticado {
  return {
    id_usuario: 1,
    nombre: "Usuario",
    ape_paterno: "Prueba",
    ape_materno: "Local",
    rol,
  };
}

function contexto(rol: Rol, usuario = perfil(rol === "medico" ? "medicos" : rol)): DemoContextType {
  return {
    autenticacionCargando: false,
    rolActivo: rol,
    setRolActivo: vi.fn(),
    autenticado: true,
    setAutenticado: vi.fn(),
    modoDemo: false,
    setModoDemo: vi.fn(),
    usuarioAutenticado: usuario,
    setUsuarioAutenticado: vi.fn(),
    usuarioActivo: USUARIOS_DEMO[rol],
  };
}

function renderRuta(rol: Rol, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoContext.Provider value={contexto(rol)}>
        <RutasClinicTec />
      </DemoContext.Provider>
    </MemoryRouter>,
  );
}

describe("rutas según rol", () => {
  it.each([
    ["administrador", "/admin/dashboard", "Contenido Dashboard administrador"],
    ["recepcion", "/recepcion/agenda", "Contenido Agenda recepción"],
    ["medico", "/medico/agenda", "Contenido Agenda médico"],
  ] as const)("muestra la pantalla inicial de %s", (rol, path, contenido) => {
    renderRuta(rol, path);
    expect(screen.getByText(contenido)).toBeTruthy();
  });

  it("redirige la ruta no autorizada al inicio del rol", async () => {
    renderRuta("administrador", "/medico/agenda");
    expect(await screen.findByText("Contenido Dashboard administrador")).toBeTruthy();
  });

  it("muestra en el menú únicamente las opciones del rol real", () => {
    renderRuta("administrador", "/admin/dashboard");
    const menu = screen.getByRole("navigation", { name: "Menú de secciones" });
    expect(menu.textContent).toContain("Usuarios");
    expect(menu.textContent).toContain("Clínicas");
    expect(menu.textContent).toContain("Pacientes");
    expect(menu.textContent).not.toContain("Agenda del día");
  });

  it("muestra el selector de rol solo dentro del modo demo", () => {
    const demoContext = {
      ...contexto("administrador"),
      modoDemo: true,
      usuarioAutenticado: null,
    };
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <DemoContext.Provider value={demoContext}>
          <RutasClinicTec />
        </DemoContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Recepción" })).toBeTruthy();
  });

  it.each([
    ["recepcion", "/recepcion/agenda", "Agenda del día", "Usuarios"],
    ["medico", "/medico/agenda", "Mi agenda", "Clínicas"],
  ] as const)("presenta el menú permitido para %s", (rol, ruta, permitido, noPermitido) => {
    renderRuta(rol, ruta);
    const menu = screen.getByRole("navigation", { name: "Menú de secciones" });
    expect(menu.textContent).toContain(permitido);
    expect(menu.textContent).not.toContain(noPermitido);
  });
});

describe("restauración de sesión", () => {
  it("espera la sesión antes de decidir la ruta y redirige según el perfil recuperado", async () => {
    let resolver!: (value: PerfilAutenticado | null) => void;
    restaurarSesion.mockReturnValueOnce(
      new Promise<PerfilAutenticado | null>((resolve) => {
        resolver = resolve;
      }),
    );

    render(
      <DemoProvider>
        <MemoryRouter initialEntries={["/recepcion/agenda"]}>
          <RutasClinicTec />
        </MemoryRouter>
      </DemoProvider>,
    );

    expect(screen.getByRole("status").textContent).toContain("Verificando sesión");
    expect(screen.queryByText("Contenido Agenda recepción")).toBeNull();
    resolver(perfil("administrador"));
    expect(await screen.findByText("Contenido Dashboard administrador")).toBeTruthy();
  });

  it("envía a login si el refresh indica que la sesión expiró", async () => {
    restaurarSesion.mockResolvedValueOnce(null);
    render(
      <DemoProvider>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <RutasClinicTec />
        </MemoryRouter>
      </DemoProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText("Contenido Dashboard administrador")).toBeNull();
    });
  });
});
