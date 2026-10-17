import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoContext, USUARIOS_DEMO } from "../../store/demo-context";
import type { DemoContextType } from "../../types";
import { authService } from "../../lib/authService";
import { LoginPage } from "./LoginPage";

vi.mock("../../lib/authService", () => ({
  authService: {
    iniciarSesion: vi.fn(),
    cerrarSesion: vi.fn(),
    restaurarSesion: vi.fn(),
  },
}));

function Ubicacion() {
  return <output data-testid="ruta">{useLocation().pathname}</output>;
}

function renderLogin() {
  const context: DemoContextType = {
    autenticacionCargando: false,
    rolActivo: "recepcion",
    setRolActivo: vi.fn(),
    autenticado: false,
    setAutenticado: vi.fn(),
    modoDemo: false,
    setModoDemo: vi.fn(),
    usuarioAutenticado: null,
    setUsuarioAutenticado: vi.fn(),
    usuarioActivo: USUARIOS_DEMO.recepcion,
  };
  return render(
    <DemoContext.Provider value={context}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </DemoContext.Provider>,
  );
}

describe("destino tras iniciar sesión", () => {
  beforeEach(() => {
    vi.mocked(authService.iniciarSesion).mockReset();
  });

  it.each([
    ["administrador", "/admin/dashboard"],
    ["recepcion", "/recepcion/agenda"],
    ["medicos", "/medico/agenda"],
  ] as const)("redirige a %s a %s", async (rol, destino) => {
    vi.mocked(authService.iniciarSesion).mockResolvedValue({
      data: {
        access_token: "token-local",
        token_type: "Bearer",
        perfil: {
          id_usuario: 1,
          nombre: "Cuenta",
          ape_paterno: "Prueba",
          ape_materno: "Local",
          rol,
        },
      },
      error: null,
      status: 200,
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "cuenta" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "clave1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect((await screen.findByTestId("ruta")).textContent).toBe(destino);
  });
});
