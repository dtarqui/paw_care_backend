/**
 * Número de recibo visible para el cliente: `R-2026-000042`.
 *
 * Se deriva del id del pago y no de un contador propio a propósito. Un contador
 * ("el siguiente de hoy") necesita leer cuántos hay antes de escribir, y dos cobros
 * simultáneos en el mostrador pueden leer el mismo número — que es justamente el
 * riesgo que no se quiere en el papel que se le entrega a alguien. El id ya es único
 * y no cambia nunca, así que el número tampoco.
 *
 * El prefijo es `R-` y no "RECIBO-"/"RECEIPT-" porque es un identificador: se cita por
 * teléfono y se imprime en papel, así que no puede cambiar según el idioma en que
 * estaba la pantalla cuando se emitió.
 */
export function receiptNumber(paymentId: number, isoDate: string): string {
  const year = isoDate.slice(0, 4);
  return `R-${year}-${String(paymentId).padStart(6, "0")}`;
}
