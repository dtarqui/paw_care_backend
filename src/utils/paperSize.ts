import { Request } from "express";

/**
 * Tamaño del papel de los documentos que se imprimen (comprobante de pago y carnet
 * de vacunación). Llega como `?paper=` desde el frontend, que lo guarda por
 * dispositivo: la impresora está enchufada a una computadora concreta, así que el
 * mostrador con la impresora de tickets y la oficina con la de hojas pueden —y
 * suelen— necesitar cosas distintas.
 *
 * Las medidas van en puntos PostScript (72 por pulgada), que es lo que espera pdfkit.
 */
export const PAPER_SIZES = ["half-letter", "letter", "a4", "ticket-80mm"] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

/** Media carta: el tamaño natural de un recibo o un carnet — no desperdicia media
 * hoja y sigue entrando en cualquier impresora común. */
export const DEFAULT_PAPER_SIZE: PaperSize = "half-letter";

interface PaperGeometry {
  width: number;
  /** Alto fijo de la hoja, o `null` si el papel es continuo y lo define el contenido. */
  height: number | null;
  margin: number;
}

const GEOMETRY: Record<PaperSize, PaperGeometry> = {
  "half-letter": { width: 396, height: 612, margin: 36 },
  letter: { width: 612, height: 792, margin: 48 },
  a4: { width: 595.28, height: 841.89, margin: 48 },
  // 80 mm es el ancho de rollo térmico más común en un mostrador. El alto no es fijo:
  // el papel es continuo, así que lo calcula cada documento según lo que ocupa —
  // poner una altura fija dejaría salir medio metro de papel en blanco.
  "ticket-80mm": { width: 226.77, height: null, margin: 14 },
};

/** El papel continuo (rollo térmico) no tiene alto de hoja: lo define el contenido. */
export function isContinuous(size: PaperSize): boolean {
  return GEOMETRY[size].height === null;
}

export function isPaperSize(value: string): value is PaperSize {
  return (PAPER_SIZES as readonly string[]).includes(value);
}

export function readPaperSize(req: Request): PaperSize {
  const value = String(req.query.paper ?? "");
  return isPaperSize(value) ? value : DEFAULT_PAPER_SIZE;
}

/**
 * Geometría de la página. `contentHeight` es lo que el documento calcula que va a
 * ocupar y solo se usa con papel continuo; en una hoja se ignora.
 */
export function paperGeometry(size: PaperSize, contentHeight: number) {
  const geometry = GEOMETRY[size];
  return {
    width: geometry.width,
    height: geometry.height ?? Math.max(contentHeight, 200),
    margin: geometry.margin,
    /** Con papel angosto no entran dos columnas ni tipografías grandes. */
    narrow: geometry.width < 300,
  };
}
