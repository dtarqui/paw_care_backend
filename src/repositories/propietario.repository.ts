import { propietarios } from "../data/propietarios.data";
import { Propietario } from "../types";

export const propietarioRepository = {
  findAll(): Propietario[] {
    return propietarios;
  },

  findById(id: number): Propietario | undefined {
    return propietarios.find((p) => p.id === id);
  },

  findByCi(ci: string): Propietario | undefined {
    return propietarios.find((p) => p.ci === ci);
  },

  create(propietario: Propietario): Propietario {
    propietarios.push(propietario);
    return propietario;
  },

  nextId(): number {
    return Math.max(0, ...propietarios.map((p) => p.id)) + 1;
  },
};
