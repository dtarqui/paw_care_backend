import { veterinarios } from "../data/veterinarios.data";
import { Veterinario } from "../types";

export const veterinarioRepository = {
  findAll(): Veterinario[] {
    return veterinarios;
  },

  findById(id: number): Veterinario | undefined {
    return veterinarios.find((v) => v.id === id);
  },

  findByUsuarioId(usuarioId: number): Veterinario | undefined {
    return veterinarios.find((v) => v.usuarioId === usuarioId);
  },

  create(veterinario: Veterinario): Veterinario {
    veterinarios.push(veterinario);
    return veterinario;
  },

  nextId(): number {
    return Math.max(0, ...veterinarios.map((v) => v.id)) + 1;
  },
};
