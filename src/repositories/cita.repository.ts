import { BLOQUES_HORARIO, citas } from "../data/citas.data";
import { Cita } from "../types";

export const citaRepository = {
  findAll(): Cita[] {
    return [...citas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  },

  findOcupadosPorVeterinarioYFecha(veterinarioId: number, fechaISO: string, excluirCitaId?: number): string[] {
    return citas
      .filter((c) => {
        const mismaFecha = c.fechaHora.slice(0, 10) === fechaISO;
        return c.veterinario.id === veterinarioId && mismaFecha && c.estado !== "CANCELADA" && c.id !== excluirCitaId;
      })
      .map((c) => c.fechaHora.slice(11, 16));
  },

  findById(id: number): Cita | undefined {
    return citas.find((c) => c.id === id);
  },

  bloquesHorarioBase(): string[] {
    return BLOQUES_HORARIO;
  },
};
