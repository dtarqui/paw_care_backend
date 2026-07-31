// Compartido entre cita.service.ts y horario.service.ts (un veterinario solo
// gestiona su propia agenda/horario) — vive acá para que ninguno de los dos
// tenga que importar del otro y generar una dependencia circular.
export class AgendaAjenaError extends Error {
  constructor(mensaje = "Como veterinario solo puedes gestionar tu propia agenda") {
    super(mensaje);
    this.name = "AgendaAjenaError";
  }
}
