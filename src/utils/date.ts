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
