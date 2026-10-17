import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoContext, USUARIOS_DEMO } from "../../store/demo-context";
import type { DemoContextType } from "../../types";
import { usuariosService, type UsuarioSistema } from "../../lib/usuariosService";
import { UsuariosPage } from "./UsuariosPage";

vi.mock("../../lib/usuariosService", () => ({
  usuariosService: {
    listar: vi.fn(),
    listarClinicas: vi.fn(),
    crear: vi.fn(),
    editar: vi.fn(),
  },
}));

const usuariosReales: UsuarioSistema[] = [{
  id_usuario: 90,
  nombre: "Administradora",
  ape_paterno: "Real",
  ape_materno: "Local",
  usuario: "admin_real",
  rol: "administrador",
  medico: null,
}];

function renderUsuarios(modoDemo: boolean) {
  const contexto: DemoContextType = {
    autenticacionCargando: false,
    rolActivo: modoDemo ? "administrador" : "administrador",
    setRolActivo: vi.fn(),
    autenticado: true,
    setAutenticado: vi.fn(),
    modoDemo,
    setModoDemo: vi.fn(),
    usuarioAutenticado: modoDemo ? null : {
      id_usuario: 5,
      nombre: "Admin",
      ape_paterno: "Real",
      ape_materno: "Local",
      rol: "administrador",
    },
    setUsuarioAutenticado: vi.fn(),
    usuarioActivo: USUARIOS_DEMO.administrador,
  };
  return render(
    <DemoContext.Provider value={contexto}>
      <UsuariosPage />
    </DemoContext.Provider>,
  );
}

describe("UsuariosPage: edición real frente a demostración", () => {
  beforeEach(() => {
    vi.mocked(usuariosService.listar).mockReset();
    vi.mocked(usuariosService.listarClinicas).mockReset();
    vi.mocked(usuariosService.crear).mockReset();
    vi.mocked(usuariosService.editar).mockReset();
  });

  it("mantiene datos y acciones ficticios en modo demo sin llamar a la API", async () => {
    renderUsuarios(true);

    expect(await screen.findByText("Ana García")).toBeTruthy();
    expect(screen.getByText(/esta lista y sus acciones son ficticias/)).toBeTruthy();
    expect(usuariosService.listar).not.toHaveBeenCalled();
    expect(usuariosService.crear).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Editar Ana" }));
    expect(screen.getByText(/La edición de usuarios es solo una demostración/)).toBeTruthy();
  });

  it("muestra cuentas reales y mantiene deshabilitada la edición sin aparentar guardado", async () => {
    vi.mocked(usuariosService.listar).mockResolvedValue(usuariosReales);
    vi.mocked(usuariosService.listarClinicas).mockResolvedValue([]);
    renderUsuarios(false);

    expect(await screen.findByText("Administradora Real Local")).toBeTruthy();
    expect(screen.queryByText("Ana García")).toBeNull();
    expect(screen.getByText(/El nombre de usuario, el rol y la contraseña no se modifican aquí/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar Administradora" })).toBeTruthy();
  });

  it("guarda la edición real en la API y actualiza la fila", async () => {
    vi.mocked(usuariosService.listar).mockResolvedValue(usuariosReales);
    vi.mocked(usuariosService.listarClinicas).mockResolvedValue([]);
    vi.mocked(usuariosService.editar).mockResolvedValue({
      ...usuariosReales[0],
      nombre: "Nombre actualizado",
    });
    renderUsuarios(false);

    fireEvent.click(await screen.findByRole("button", { name: "Editar Administradora" }));
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Nombre actualizado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Nombre actualizado Real Local")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("actualizaron correctamente");
    expect(usuariosService.editar).toHaveBeenCalledWith(90, {
      nombre: "Nombre actualizado",
      ape_paterno: "Real",
      ape_materno: "Local",
    });
  });

  it("muestra errores de la API y mantiene el formulario abierto", async () => {
    vi.mocked(usuariosService.listar).mockResolvedValue(usuariosReales);
    vi.mocked(usuariosService.listarClinicas).mockResolvedValue([]);
    vi.mocked(usuariosService.editar).mockRejectedValue(new Error("Error de validación."));
    renderUsuarios(false);

    fireEvent.click(await screen.findByRole("button", { name: "Editar Administradora" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Error de validación.");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
  });

  it("edita una cuenta médica usando la actualización coordinada de la API", async () => {
    const cuentaMedica: UsuarioSistema = {
      ...usuariosReales[0],
      id_usuario: 91,
      nombre: "Médico",
      rol: "medicos",
      medico: {
        id_clinica: 1,
        nombre_clinica: "Clínica",
        especialidad: "General",
        correo: null,
        estado: true,
      },
    };
    vi.mocked(usuariosService.listar).mockResolvedValue([cuentaMedica]);
    vi.mocked(usuariosService.listarClinicas).mockResolvedValue([]);
    vi.mocked(usuariosService.editar).mockResolvedValue({
      ...cuentaMedica,
      nombre: "Médico Actualizado",
    });
    renderUsuarios(false);

    fireEvent.click(await screen.findByRole("button", { name: "Editar Médico" }));
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Médico Actualizado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Médico Actualizado Real Local")).toBeTruthy();
    expect(usuariosService.editar).toHaveBeenCalledWith(91, {
      nombre: "Médico Actualizado",
      ape_paterno: "Real",
      ape_materno: "Local",
    });
  });
});
