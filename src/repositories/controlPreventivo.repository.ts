import { ControlRegistro, controlesPreventivos } from "../data/controles-preventivos.data";

export const controlPreventivoRepository = {
  findByMascotaId(mascotaId: number): ControlRegistro[] {
    return controlesPreventivos
      .filter((c) => c.mascotaId === mascotaId)
      .sort((a, b) => b.proximaDosis.localeCompare(a.proximaDosis));
  },

  findAll(): ControlRegistro[] {
    return controlesPreventivos;
  },

  create(registro: ControlRegistro): ControlRegistro {
    controlesPreventivos.push(registro);
    return registro;
  },

  nextId(): number {
    return Math.max(0, ...controlesPreventivos.map((c) => c.id)) + 1;
  },
};
