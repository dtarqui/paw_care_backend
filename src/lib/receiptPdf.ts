import PDFDocument from "pdfkit";
import { PaymentReceipt } from "../types";
import { literalToDisplay } from "../utils/date";
import { Labels, Language } from "../utils/labels";

/**
 * El comprobante que se le entrega al cliente.
 *
 * Media carta (media hoja A4) y no una página entera: es un recibo, no un informe, y
 * a esa altura entra en una impresora de mostrador o se lee de un vistazo en el
 * teléfono. Todo el texto viene traducido desde `labelsFor(readLanguage(req))`, igual
 * que los reportes.
 */
const WIDTH = 420;
const HEIGHT = 595;
const MARGIN = 36;
const CONTENT = WIDTH - MARGIN * 2;

const INK = "#111111";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const ACCENT = "#6d28d9";

function labelValue(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  options: { y?: number } = {}
) {
  const y = options.y ?? doc.y;
  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(label.toUpperCase(), MARGIN, y);
  doc.font("Helvetica").fontSize(11).fillColor(INK).text(value, MARGIN, doc.y + 1, { width: CONTENT });
  doc.moveDown(0.6);
}

function divider(doc: InstanceType<typeof PDFDocument>) {
  const y = doc.y + 2;
  doc.moveTo(MARGIN, y).lineTo(WIDTH - MARGIN, y).strokeColor(LINE).lineWidth(1).stroke();
  doc.y = y + 10;
}

export function buildReceiptPdf(
  receipt: PaymentReceipt,
  label: Labels,
  language: Language
): InstanceType<typeof PDFDocument> {
  const t = label.text;
  const doc = new PDFDocument({ size: [WIDTH, HEIGHT], margin: MARGIN });

  // Cabecera: marca a la izquierda, número de comprobante a la derecha. El número es
  // lo que se cita cuando alguien reclama, así que va destacado y no perdido al pie.
  doc.font("Helvetica-Bold").fontSize(18).fillColor(ACCENT).text("PawCare", MARGIN, MARGIN);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(t("receiptClinic"), MARGIN, doc.y + 1);

  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(t("receiptNumber").toUpperCase(), MARGIN, MARGIN, {
    width: CONTENT,
    align: "right",
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(INK)
    .text(receipt.receiptNumber, MARGIN, doc.y + 1, { width: CONTENT, align: "right" });

  doc.y = MARGIN + 54;
  divider(doc);

  // El monto es el dato que se busca primero: va grande y solo.
  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(t("receiptAmountPaid").toUpperCase(), MARGIN, doc.y);
  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor(INK)
    .text(`Bs. ${receipt.amount.toFixed(2)}`, MARGIN, doc.y + 2);
  doc.moveDown(0.4);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text(
      `${label.paymentMethod(receipt.method)} · ${literalToDisplay(receipt.date, language)}`,
      MARGIN,
      doc.y
    );
  doc.moveDown(0.8);
  divider(doc);

  labelValue(doc, t("receiptReceivedFrom"), `${receipt.owner.firstName} ${receipt.owner.paternalLastName}`);
  labelValue(doc, t("nationalId"), receipt.owner.nationalId);
  labelValue(doc, t("receiptConcept"), `${label.serviceType(receipt.visit.serviceType)} — ${receipt.pet.name}`);
  labelValue(doc, t("vet"), `${receipt.vet.firstName} ${receipt.vet.paternalLastName}`);
  labelValue(doc, t("receiptVisitDate"), literalToDisplay(receipt.visit.date, language));

  divider(doc);
  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(t("receiptFooter"), MARGIN, doc.y, {
    width: CONTENT,
  });

  return doc;
}
