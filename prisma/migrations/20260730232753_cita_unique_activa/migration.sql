-- Blindaje a nivel de base de datos contra doble-reserva exacta: un mismo
-- veterinario no puede tener dos citas activas (no CANCELADA) a la misma
-- fechaHora. La validación de aplicación (ConflictoDeAgendaError, 409) ya
-- cubre esto en el camino normal; este índice es un respaldo para
-- condiciones de carrera. Prisma DSL no soporta índices únicos parciales
-- (WHERE), por eso es una migración manual — ver database/MODELO_DATOS.md
-- sección 5.
CREATE UNIQUE INDEX cita_vet_fecha_activa_idx
  ON "Cita" ("veterinarioId", "fechaHora")
  WHERE estado <> 'CANCELADA';
