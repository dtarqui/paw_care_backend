/** Fecha del servidor en YYYY-MM-DD, sin pasar por conversión UTC (ver nota en citas.data.ts). */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(fechaISO: string, dias: number): string {
  const [yyyy, mm, dd] = fechaISO.split("-").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  d.setDate(d.getDate() + dias);
  const y2 = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, "0");
  const d2 = String(d.getDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

/** "Ahora" en formato YYYY-MM-DDTHH:mm, misma convención literal que usa Cita.fechaHora
 * (ver citas.data.ts) — nunca pasar esto por `new Date(string)`, se compara como texto. */
export function ahoraLiteral(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function sumarHoras(literalISO: string, horas: number): string {
  const [fecha, hora] = literalISO.split("T");
  const [yyyy, mm, dd] = fecha.split("-").map(Number);
  const [hh, mi] = hora.split(":").map(Number);
  const d = new Date(yyyy, mm - 1, dd, hh, mi);
  d.setHours(d.getHours() + horas);
  const y2 = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, "0");
  const d2 = String(d.getDate()).padStart(2, "0");
  const h2 = String(d.getHours()).padStart(2, "0");
  const mi2 = String(d.getMinutes()).padStart(2, "0");
  return `${y2}-${m2}-${d2}T${h2}:${mi2}`;
}

/**
 * Puente entre los literales "YYYY-MM-DD" / "YYYY-MM-DDTHH:mm" que usa toda la
 * capa de servicios/repositorios y los `Date` reales que exige Prisma. Siempre se
 * construye y se lee con getters LOCALES (nunca UTC) — es la misma convención que
 * ya usan `ahoraLiteral`/`sumarHoras`, así el viaje literal -> Date -> literal es
 * exacto sin importar la zona horaria del proceso, siempre que sea la misma en
 * escritura y lectura (un único proceso Node, que es el caso acá).
 */
export function literalToDate(literal: string): Date {
  const [fecha, hora] = literal.split("T");
  const [yyyy, mm, dd] = fecha.split("-").map(Number);
  if (!hora) return new Date(yyyy, mm - 1, dd);
  const [hh, mi] = hora.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, mi);
}

export function dateToLiteral(fecha: Date): string {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mi = String(fecha.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function dateToLiteralDate(fecha: Date): string {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Para columnas `@db.Date` (sin hora, ej. Mascota.fechaNacimiento,
 * ControlPreventivo.fechaAplicacion/proximaDosis): a diferencia de un `DateTime`
 * normal, Prisma siempre representa/lee un `@db.Date` como medianoche UTC del
 * calendario guardado, sin importar la zona horaria del proceso. Usar los
 * getters/constructores LOCALES de `literalToDate`/`dateToLiteralDate` ahí corre
 * la fecha un día para adelante o atrás según el offset del servidor — por eso
 * estas dos variantes usan explícitamente UTC.
 */
export function literalDateOnlyToDate(literalYYYYMMDD: string): Date {
  const [yyyy, mm, dd] = literalYYYYMMDD.split("-").map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

export function dateOnlyToLiteral(fecha: Date): string {
  const yyyy = fecha.getUTCFullYear();
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Para columnas `@db.Time` (Horario.horaInicio/horaFin): a diferencia de
 * `@db.Date`, se comprobó empíricamente (round-trip directo con Prisma) que
 * se comportan como un `DateTime` normal — escribir y leer con getters
 * LOCALES es exacto. Se usa una fecha ancla arbitraria (1970-01-01); solo
 * importa la hora.
 */
export function horaLiteralToDate(literalHHmm: string): Date {
  const [hh, mi] = literalHHmm.split(":").map(Number);
  return new Date(1970, 0, 1, hh, mi);
}

export function dateToHoraLiteral(fecha: Date): string {
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mi = String(fecha.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}
