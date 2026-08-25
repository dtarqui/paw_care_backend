// Compartido entre appointment.service.ts y schedule.service.ts (un veterinario solo
// gestiona su propia agenda/horario) — vive acá para que ninguno de los dos
// tenga que importar del otro y generar una dependencia circular.
export class ForeignScheduleError extends Error {
  constructor(message = "Como veterinario solo puedes gestionar tu propia agenda") {
    super(message);
    this.name = "ForeignScheduleError";
  }
}
