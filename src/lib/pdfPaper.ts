import PDFDocument from "pdfkit";
import { isContinuous, paperGeometry, PaperSize } from "../utils/paperSize";

export interface PaperLayout {
  width: number;
  height: number;
  margin: number;
  content: number;
  /** Con papel angosto no entran columnas ni tipografías grandes. */
  narrow: boolean;
}

/** Altura de sobra para medir: nunca se imprime, solo se usa para dejar que el
 * contenido se dibuje entero sin saltar de página. */
const PROBE_HEIGHT = 5000;

/**
 * Crea el documento del tamaño que corresponde y lo dibuja.
 *
 * En una hoja el alto ya está dado. En papel continuo —el rollo térmico de 80 mm—
 * no: el alto es el que ocupe el contenido, así que el documento se dibuja **dos
 * veces**. La primera es un borrador que nunca sale de memoria y solo sirve para
 * preguntarle a pdfkit dónde terminó; con esa medida se abre la página real. Estimar
 * la altura con una constante era lo anterior, y dejaba salir varios centímetros de
 * papel en blanco después de cada comprobante.
 */
export function renderOnPaper(
  paper: PaperSize,
  draw: (doc: InstanceType<typeof PDFDocument>, layout: PaperLayout) => void
): InstanceType<typeof PDFDocument> {
  const base = paperGeometry(paper, 0);
  const layoutFor = (height: number): PaperLayout => ({
    width: base.width,
    height,
    margin: base.margin,
    content: base.width - base.margin * 2,
    narrow: base.narrow,
  });

  if (!isContinuous(paper)) {
    const doc = new PDFDocument({ size: [base.width, base.height], margin: base.margin });
    draw(doc, layoutFor(base.height));
    return doc;
  }

  const probe = new PDFDocument({ size: [base.width, PROBE_HEIGHT], margin: base.margin });
  draw(probe, layoutFor(PROBE_HEIGHT));
  const measured = Math.ceil(probe.y + base.margin);
  probe.end();

  const height = Math.max(measured, 120);
  const doc = new PDFDocument({ size: [base.width, height], margin: base.margin });
  draw(doc, layoutFor(height));
  return doc;
}
