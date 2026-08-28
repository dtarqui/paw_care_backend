import PDFDocument from "pdfkit";
import { PaymentReceipt } from "../types";
import { literalToDisplay } from "../utils/date";
import { Labels, Language } from "../utils/labels";
import { PaperSize } from "../utils/paperSize";
import { renderOnPaper } from "./pdfPaper";

/**
 * El comprobante que se le entrega al cliente.
 *
 * Por defecto en media carta: es un recibo, no un informe, y a esa altura entra en
 * cualquier impresora sin desperdiciar media hoja. El tamaño lo elige quien imprime
 * (`utils/paperSize.ts`) — en un rollo térmico de 80 mm el mismo contenido se
 * reacomoda en una sola columna, con tipografías más chicas, y el alto del papel lo
 * calcula `renderOnPaper` a partir de lo que ocupa.
 *
 * Todo el texto viene traducido desde `labelsFor(readLanguage(req))`, igual que los
 * reportes.
 */
const INK = "#111111";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const ACCENT = "#6d28d9";

export function buildReceiptPdf(
  receipt: PaymentReceipt,
  label: Labels,
  language: Language,
  paper: PaperSize
): InstanceType<typeof PDFDocument> {
  const t = label.text;

  return renderOnPaper(paper, (doc, { width, margin, content, narrow }) => {
    function divider() {
      const y = doc.y + 2;
      doc.moveTo(margin, y).lineTo(width - margin, y).strokeColor(LINE).lineWidth(1).stroke();
      doc.y = y + 10;
    }

    function labelValue(caption: string, value: string) {
      doc
        .font("Helvetica")
        .fontSize(narrow ? 7 : 8)
        .fillColor(MUTED)
        .text(caption.toUpperCase(), margin, doc.y);
      doc
        .font("Helvetica")
        .fontSize(narrow ? 9 : 11)
        .fillColor(INK)
        .text(value, margin, doc.y + 1, { width: content });
      doc.moveDown(0.6);
    }

    // Cabecera. En hoja va la marca a la izquierda y el número a la derecha; en un
    // ticket angosto no hay dos columnas, así que se apila.
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 14 : 18)
      .fillColor(ACCENT)
      .text("PawCare", margin, margin);
    doc
      .font("Helvetica")
      .fontSize(narrow ? 8 : 9)
      .fillColor(MUTED)
      .text(t("receiptClinic"), margin, doc.y + 1);

    if (narrow) {
      doc.moveDown(0.6);
      doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(t("receiptNumber").toUpperCase(), margin, doc.y);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(receipt.receiptNumber, margin, doc.y + 1);
      doc.moveDown(0.4);
    } else {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(t("receiptNumber").toUpperCase(), margin, margin, {
        width: content,
        align: "right",
      });
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(INK)
        .text(receipt.receiptNumber, margin, doc.y + 1, { width: content, align: "right" });
      doc.y = margin + 54;
    }

    divider();

    // El monto es el dato que se busca primero: va grande y solo.
    doc
      .font("Helvetica")
      .fontSize(narrow ? 7 : 8)
      .fillColor(MUTED)
      .text(t("receiptAmountPaid").toUpperCase(), margin, doc.y);
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 18 : 26)
      .fillColor(INK)
      .text(`Bs. ${receipt.amount.toFixed(2)}`, margin, doc.y + 2);
    doc.moveDown(0.4);
    doc
      .font("Helvetica")
      .fontSize(narrow ? 8 : 10)
      .fillColor(MUTED)
      .text(`${label.paymentMethod(receipt.method)} · ${literalToDisplay(receipt.date, language)}`, margin, doc.y, {
        width: content,
      });
    doc.moveDown(0.8);
    divider();

    labelValue(t("receiptReceivedFrom"), `${receipt.owner.firstName} ${receipt.owner.paternalLastName}`);
    labelValue(t("nationalId"), receipt.owner.nationalId);
    labelValue(t("receiptConcept"), `${label.serviceType(receipt.visit.serviceType)} — ${receipt.pet.name}`);
    labelValue(t("vet"), `${receipt.vet.firstName} ${receipt.vet.paternalLastName}`);
    labelValue(t("receiptVisitDate"), literalToDisplay(receipt.visit.date, language));

    divider();
    doc
      .font("Helvetica")
      .fontSize(narrow ? 6.5 : 8)
      .fillColor(MUTED)
      .text(t("receiptFooter"), margin, doc.y, { width: content });
  });
}
