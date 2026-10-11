import { useState, type FormEvent } from "react";
import { Input, Select } from "../ui/Input";
import { Button } from "../ui/Button";
import type { NuevoPaciente } from "../../lib/pacientesService";

interface FormularioPacienteProps {
  inicial?: Partial<NuevoPaciente>;
  onGuardar: (datos: NuevoPaciente) => Promise<void>;
  onCancelar: () => void;
  cargando?: boolean;
}

const CAMPOS_VACIOS: NuevoPaciente = {
  nombre: "", ape_paterno: "", ape_materno: "",
  fecha_nacimiento: "", sexo: "",
  telefono: "", correo: "", direccion: "",
};

export function FormularioPaciente({
  inicial,
  onGuardar,
  onCancelar,
  cargando = false,
}: FormularioPacienteProps) {
  const [form, setForm] = useState<NuevoPaciente>({ ...CAMPOS_VACIOS, ...inicial });
  const [errores, setErrores] = useState<Partial<Record<keyof NuevoPaciente, string>>>({});

  function actualizar(campo: keyof NuevoPaciente, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function validar(): boolean {
    const e: Partial<Record<keyof NuevoPaciente, string>> = {};
    if (!form.nombre.trim())       e.nombre       = "Nombre es requerido.";
    if (!form.ape_paterno.trim())  e.ape_paterno  = "Apellido paterno es requerido.";
    if (!form.ape_materno.trim())  e.ape_materno  = "Apellido materno es requerido.";
    if (!form.fecha_nacimiento)    e.fecha_nacimiento = "Fecha de nacimiento es requerida.";
    if (!form.sexo)                e.sexo         = "Sexo es requerido.";
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.correo)) {
      e.correo = "Correo inválido.";
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    await onGuardar(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Nombre *" value={form.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
          error={errores.nombre} autoComplete="given-name" />
        <Input label="Apellido paterno *" value={form.ape_paterno}
          onChange={(e) => actualizar("ape_paterno", e.target.value)}
          error={errores.ape_paterno} />
        <Input label="Apellido materno *" value={form.ape_materno}
          onChange={(e) => actualizar("ape_materno", e.target.value)}
          error={errores.ape_materno} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Fecha de nacimiento *" type="date" value={form.fecha_nacimiento}
          onChange={(e) => actualizar("fecha_nacimiento", e.target.value)}
          error={errores.fecha_nacimiento} />
        <Select label="Sexo *" value={form.sexo}
          onChange={(e) => actualizar("sexo", e.target.value)}
          error={errores.sexo}>
          <option value="">Selecciona…</option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
          <option value="Otro">Otro</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Teléfono" type="tel" value={form.telefono ?? ""}
          onChange={(e) => actualizar("telefono", e.target.value)}
          error={errores.telefono} autoComplete="tel" />
        <Input label="Correo electrónico" type="email" value={form.correo ?? ""}
          onChange={(e) => actualizar("correo", e.target.value)}
          error={errores.correo} autoComplete="email" />
      </div>

      <Input label="Dirección" value={form.direccion ?? ""}
        onChange={(e) => actualizar("direccion", e.target.value)}
        error={errores.direccion} autoComplete="street-address" />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variante="secondary" onClick={onCancelar}
          disabled={cargando}>
          Cancelar
        </Button>
        <Button type="submit" variante="primary" cargando={cargando}>
          Guardar paciente
        </Button>
      </div>
    </form>
  );
}
