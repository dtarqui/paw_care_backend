import PDFDocument from "pdfkit";
import { VaccinationCard } from "../types";
import { literalToDisplay } from "../utils/date";
import { Labels, Language } from "../utils/labels";
import { PaperSize } from "../utils/paperSize";
import { renderOnPaper } from "./pdfPaper";

/**
 * El carnet de vacunación y desparasitación de una mascota.
 *
 * Es un documento que el dueño se lleva: lo pide otra clínica, una guardería o una
 * aduana al viajar con el animal. Por eso arriba van los datos que lo identifican y
 * abajo la libreta —una fila por dosis, de la más vieja a la más nueva— con la
 * próxima marcada cuando ya venció.
 *
 * Por defecto en media carta, configurable como el comprobante (`utils/paperSize.ts`).
 */
const INK = "#111111";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const ACCENT = "#6d28d9";
const OVERDUE = "#b91c1c";

const ROW_HEIGHT = 22;

export function buildVaccinationCardPdf(
  card: VaccinationCard,
  label: Labels,
  language: Language,
  paper: PaperSize
): InstanceType<typeof PDFDocument> {
  const t = label.text;

  return renderOnPaper(paper, (doc, { width, height, margin, content, narrow }) => {
    function divider() {
      const y = doc.y + 2;
      doc.moveTo(margin, y).lineTo(width - margin, y).strokeColor(LINE).lineWidth(1).stroke();
      doc.y = y + 10;
    }

    function field(caption: string, value: string) {
      doc
        .font("Helvetica")
        .fontSize(narrow ? 6.5 : 7.5)
        .fillColor(MUTED)
        .text(caption.toUpperCase(), margin, doc.y);
      doc
        .font("Helvetica")
        .fontSize(narrow ? 8.5 : 10)
        .fillColor(INK)
        .text(value || "—", margin, doc.y + 1, { width: content });
      doc.moveDown(0.45);
    }

    // Cabecera
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 13 : 17)
      .fillColor(ACCENT)
      .text("PawCare", margin, margin);
    doc
      .font("Helvetica")
      .fontSize(narrow ? 8 : 10)
      .fillColor(INK)
      .text(t("cardTitle"), margin, doc.y + 2);
    doc.moveDown(0.6);
    divider();

    // Identidad de la mascota: es lo que hace que el carnet valga para un tercero.
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 14 : 20)
      .fillColor(INK)
      .text(card.pet.name, margin, doc.y);
    doc
      .font("Helvetica")
      .fontSize(narrow ? 8 : 10)
      .fillColor(MUTED)
      .text(
        [label.speciesOrRaw(card.pet.species), card.pet.breed, label.sexOrRaw(card.pet.sex)]
          .filter(Boolean)
          .join(" · "),
        margin,
        doc.y + 1,
        { width: content }
      );
    doc.moveDown(0.7);

    field(t("cardBirthDate"), card.pet.birthDate ? literalToDisplay(card.pet.birthDate, language) : "");
    field(t("owner"), `${card.owner.firstName} ${card.owner.paternalLastName}`);
    field(t("nationalId"), card.owner.nationalId);
    if (card.owner.phone) field(t("phone"), card.owner.phone);

    divider();

    // La libreta.
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 9 : 11)
      .fillColor(INK)
      .text(t("cardHistory"), margin, doc.y);
    doc.moveDown(0.5);

    if (card.controls.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(narrow ? 8 : 10)
        .fillColor(MUTED)
        .text(t("cardEmpty"), margin, doc.y, { width: content });
    } else if (narrow) {
      // En 80 mm no entran tres columnas: cada dosis va como un bloque.
      for (const control of card.controls) {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(label.preventiveControlType(control.type), margin, doc.y);
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(control.overdue ? OVERDUE : MUTED)
          .text(
            `${t("cardApplied")}: ${literalToDisplay(control.appliedOn, language)}   ` +
              `${t("cardNextDose")}: ${control.nextDoseOn ? literalToDisplay(control.nextDoseOn, language) : "—"}` +
              `${control.overdue ? ` (${t("cardOverdue")})` : ""}`,
            margin,
            doc.y + 1,
            { width: content }
          );
        doc.moveDown(0.5);
      }
    } else {
      const columns = [content * 0.34, content * 0.33, content * 0.33];
      const headers = [t("type"), t("cardApplied"), t("cardNextDose")];

      let y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
      headers.forEach((text, i) => {
        const x = margin + columns.slice(0, i).reduce((sum, w) => sum + w, 0);
        doc.text(text.toUpperCase(), x, y, { width: columns[i] });
      });
      y += 14;
      doc.moveTo(margin, y).lineTo(width - margin, y).strokeColor(LINE).stroke();
      y += 6;

      for (const control of card.controls) {
        // Cada página nueva arranca con el margen: el carnet puede pasar de una hoja
        // si la mascota tiene años de historial.
        if (y > height - margin - ROW_HEIGHT) {
          doc.addPage();
          y = margin;
        }
        const values = [
          label.preventiveControlType(control.type),
          literalToDisplay(control.appliedOn, language),
          control.nextDoseOn
            ? `${literalToDisplay(control.nextDoseOn, language)}${control.overdue ? ` · ${t("cardOverdue")}` : ""}`
            : "—",
        ];
        values.forEach((text, i) => {
          const x = margin + columns.slice(0, i).reduce((sum, w) => sum + w, 0);
          doc
            .font("Helvetica")
            .fontSize(9.5)
            .fillColor(i === 2 && control.overdue ? OVERDUE : INK)
            .text(text, x, y, { width: columns[i] });
        });
        y += ROW_HEIGHT;
      }
      doc.y = y;
    }

    doc.moveDown(0.6);
    divider();
    doc
      .font("Helvetica")
      .fontSize(narrow ? 6.5 : 8)
      .fillColor(MUTED)
      .text(`${t("cardFooter")} ${literalToDisplay(new Date().toISOString().slice(0, 10), language)}`, margin, doc.y, {
        width: content,
      });
  });
}
