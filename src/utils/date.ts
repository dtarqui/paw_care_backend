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
