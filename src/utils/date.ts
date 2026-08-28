/** Fecha del servidor en YYYY-MM-DD, sin pasar por conversión UTC. */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(isoDate: string, days: number): string {
  const [yyyy, mm, dd] = isoDate.split("-").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  d.setDate(d.getDate() + days);
  const y2 = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, "0");
  const d2 = String(d.getDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

/** "Ahora" en formato YYYY-MM-DDTHH:mm, misma convención literal que usa
 * Appointment.dateTime — nunca pasar esto por `new Date(string)`, se compara como texto. */
export function nowLiteral(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function addHours(isoLiteral: string, hours: number): string {
  const [datePart, timePart] = isoLiteral.split("T");
  const [yyyy, mm, dd] = datePart.split("-").map(Number);
  const [hh, mi] = timePart.split(":").map(Number);
  const d = new Date(yyyy, mm - 1, dd, hh, mi);
  d.setHours(d.getHours() + hours);
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
 * ya usan `nowLiteral`/`addHours`, así el viaje literal -> Date -> literal es
 * exacto sin importar la zona horaria del proceso, siempre que sea la misma en
 * escritura y lectura (un único proceso Node, que es el caso acá).
 */
export function literalToDate(literal: string): Date {
  const [datePart, timePart] = literal.split("T");
  const [yyyy, mm, dd] = datePart.split("-").map(Number);
  if (!timePart) return new Date(yyyy, mm - 1, dd);
  const [hh, mi] = timePart.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, mi);
}

export function dateToLiteral(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function dateToLiteralDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Para columnas `@db.Date` (sin hora, ej. Pet.birthDate,
 * PreventiveControl.appliedOn/nextDoseOn): a diferencia de un `DateTime`
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

export function dateOnlyToLiteral(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Para columnas `@db.Time` (Schedule.startTime/endTime): a diferencia de
 * `@db.Date`, se comprobó empíricamente (round-trip directo con Prisma) que
 * se comportan como un `DateTime` normal — escribir y leer con getters
 * LOCALES es exacto. Se usa una fecha ancla arbitraria (1970-01-01); solo
 * importa la hora.
 */
export function timeLiteralToDate(literalHHmm: string): Date {
  const [hh, mi] = literalHHmm.split(":").map(Number);
  return new Date(1970, 0, 1, hh, mi);
}

export function dateToTimeLiteral(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

/**
 * Un literal `YYYY-MM-DDTHH:mm` como lo lee una persona en el comprobante.
 *
 * Mismo criterio que el frontend (`lib/date.ts`): en español el `dd/mm/aaaa` de
 * siempre; en inglés el mes abreviado, porque `03/04` significa cosas distintas
 * según el país y en un papel que se archiva esa ambigüedad no sirve.
 */
export function literalToDisplay(literal: string, language: string): string {
  const [datePart, timePart] = literal.split("T");
  const [yyyy, mm, dd] = datePart.split("-").map(Number);
  const english = language.startsWith("en");
  const formatted = new Intl.DateTimeFormat(english ? "en-GB" : "es-BO", {
    day: "2-digit",
    month: english ? "short" : "2-digit",
    year: "numeric",
  }).format(new Date(yyyy, mm - 1, dd));
  return timePart ? `${formatted} ${timePart.slice(0, 5)}` : formatted;
}
