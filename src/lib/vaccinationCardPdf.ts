import PDFDocument from "pdfkit";
import { VaccinationCard } from "../types";
import { literalToDisplay } from "../utils/date";
import { Labels, Language } from "../utils/labels";
import { PaperSize } from "../utils/paperSize";
import { renderOnPaper } from "./pdfPaper";

/**
 * El carnet de vacunación y desparasitación de una mascota.
 *
 * Está calcado del carnet de papel que se usa en Bolivia, no del historial que se ve
 * en pantalla, porque cumple otra función: lo lee alguien que **no** tiene acceso al
 * sistema —otra clínica, una guardería, una aduana— y necesita creerle al papel.
 *
 * Cuatro decisiones que vienen del carnet real y no del modelo de datos:
 *
 * - **Identificación completa de la mascota** (especie, raza, sexo, color, peso,
 *   nacimiento) y del propietario (nombre completo, CI, teléfono, dirección). Para un
 *   tercero, "Luna, perro" no alcanza para saber que el animal que tiene delante es el
 *   del papel.
 * - **Dos registros separados**, vacunación y desparasitación, como en el carnet
 *   impreso: son dos calendarios distintos y quien lo revisa busca uno de los dos, no
 *   una lista mezclada ordenada por fecha.
 * - **Casillas en blanco a propósito**: la vacuna aplicada, su lote y la firma con
 *   sello del veterinario. El sistema no guarda esos datos —`PreventiveControl` solo
 *   tiene tipo, fecha y próxima dosis— y aunque los guardara, la validez del carnet
 *   frente a un tercero viene del sello físico y de la etiqueta del frasco pegada en
 *   su casilla, no de algo que imprima una computadora. La casilla del lote está
 *   dimensionada para que entre esa etiqueta (~10 mm de alto).
 * - **Renglones vacíos hasta el pie de la hoja**: el carnet se sigue usando después de
 *   imprimirlo. Un carnet que termina justo donde termina el historial obliga a
 *   reimprimirlo en la visita siguiente.
 *
 * En rollo térmico de 80 mm nada de esto entra —ni una tabla de cuatro columnas, ni
 * una firma sobre papel térmico, que se borra— así que ahí el documento se degrada a
 * un resumen de dosis para entregar en el mostrador, sin casillas para llenar.
 */
const INK = "#111111";
const MUTED = "#6b7280";
const LINE = "#d4d4d8";
const BAND = "#f4f4f5";
const ACCENT = "#6d28d9";
const OVERDUE = "#b91c1c";

/** Alto de renglón: la etiqueta de un frasco de vacuna mide cerca de 8 mm. */
const ROW_HEIGHT = 24;
const HEAD_HEIGHT = 16;
/** Título + encabezado + aire de después: lo que ocupa una tabla además de sus
 * renglones. Va en una constante porque el cálculo de renglones vacíos tiene que
 * restarlo entero — olvidarse del aire final empujaba el pie a una segunda hoja. */
const TITLE_GAP = 16;
const AFTER_TABLE_GAP = 12;
const TABLE_CHROME = TITLE_GAP + HEAD_HEIGHT + AFTER_TABLE_GAP;
const MIN_DEWORMING_ROWS = 3;
const MAX_BLANK_ROWS = 14;

/** Una celda vacía es una que se llena a mano sobre el papel impreso. */
type Cell = { text: string; note?: string; overdue?: boolean } | null;

interface Column {
  header: string;
  width: number;
}

export function buildVaccinationCardPdf(
  card: VaccinationCard,
  label: Labels,
  language: Language,
  paper: PaperSize
): InstanceType<typeof PDFDocument> {
  const t = label.text;
  const vaccines = card.controls.filter((c) => c.type === "VACCINE");
  const dewormings = card.controls.filter((c) => c.type === "DEWORMING");
  const ownerName = [card.owner.firstName, card.owner.paternalLastName, card.owner.maternalLastName]
    .filter(Boolean)
    .join(" ");

  return renderOnPaper(paper, (doc, { width, height, margin, content, narrow, continuous }) => {
    const right = width - margin;
    const showDate = (literal: string) => (literal ? literalToDisplay(literal, language) : "—");

    function rule(color = LINE, lineWidth = 0.8, gap = 8) {
      doc.moveTo(margin, doc.y).lineTo(right, doc.y).strokeColor(color).lineWidth(lineWidth).stroke();
      doc.y += gap;
    }

    /** Campo etiqueta-arriba/valor-abajo, la unidad de los bloques de identificación. */
    function field(caption: string, value: string, x: number, y: number, w: number) {
      doc
        .font("Helvetica")
        .fontSize(narrow ? 6 : 6.5)
        .fillColor(MUTED)
        .text(caption.toUpperCase(), x, y, { width: w, lineBreak: false, characterSpacing: 0.4 });
      doc
        .font("Helvetica")
        .fontSize(narrow ? 8.5 : 9.5)
        .fillColor(INK)
        .text(value || "—", x, y + (narrow ? 8 : 9), { width: w, lineBreak: false, ellipsis: true });
    }

    const FIELD_HEIGHT = narrow ? 20 : 23;

    /** Campos en columnas. `flex` reparte el ancho: un nombre completo necesita más
     * que un teléfono, y con tercios iguales se partía en dos renglones. */
    function fieldRow(fields: { caption: string; value: string; flex?: number }[], y: number) {
      const total = fields.reduce((sum, f) => sum + (f.flex ?? 1), 0);
      let x = margin + 10;
      for (const f of fields) {
        const columnWidth = ((content - 20) * (f.flex ?? 1)) / total;
        field(f.caption, f.value, x, y, columnWidth - 10);
        x += columnWidth;
      }
      return FIELD_HEIGHT;
    }

    /** Alto de un grupo de campos: en hoja ocupan una fila; a 80 mm, uno por renglón. */
    function fieldsHeight(count: number) {
      return narrow ? FIELD_HEIGHT * count : FIELD_HEIGHT;
    }

    function framed(y: number, boxHeight: number) {
      doc.roundedRect(margin, y, content, boxHeight, 4).lineWidth(0.8).strokeColor(LINE).stroke();
    }

    // ── Cabecera ──────────────────────────────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 13 : 16)
      .fillColor(ACCENT)
      .text("PawCare", margin, margin);
    if (!narrow) {
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(`${t("cardFooter")} ${showDate(new Date().toISOString().slice(0, 10))}`, margin, margin + 6, {
          width: content,
          align: "right",
        });
    }
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 9 : 11)
      .fillColor(INK)
      .text(t("cardTitle"), margin, doc.y + 3, { width: content });
    doc.y += 6;
    rule(ACCENT, 1.5, 12);

    // ── Identificación: mascota y propietario en un solo panel ──────────────
    // En el carnet de papel esto es un panel único. Separarlos en dos cajas con su
    // propio título gastaba, en media carta, el alto de tres dosis en aire y bordes.
    const petFields = [
      { caption: t("cardBirthDate"), value: showDate(card.pet.birthDate), flex: 1.4 },
      { caption: t("cardColor"), value: card.pet.color, flex: 1.8 },
      { caption: t("cardWeight"), value: card.pet.weight ? `${card.pet.weight} kg` : "", flex: 0.8 },
    ];
    const ownerFields = [
      { caption: t("owner"), value: ownerName, flex: 2 },
      { caption: t("nationalId"), value: card.owner.nationalId, flex: 1 },
      { caption: t("phone"), value: card.owner.phone ?? "", flex: 1 },
    ];
    const addressField = card.owner.address
      ? [{ caption: t("cardAddress"), value: card.owner.address, flex: 1 }]
      : [];

    /** Los campos en fila (hoja) o apilados (80 mm, donde tres columnas dejan cada
     * valor en dos letras por renglón). Devuelve el alto que ocupó. */
    function fields(list: { caption: string; value: string; flex?: number }[], y: number) {
      if (!narrow) return fieldRow(list, y);
      list.forEach((f, i) => field(f.caption, f.value, margin, y + FIELD_HEIGHT * i, content));
      return FIELD_HEIGHT * list.length;
    }

    const idTop = doc.y;
    const nameBlock = narrow ? 30 : 34;
    const idHeight =
      (narrow ? 0 : 18) +
      nameBlock +
      fieldsHeight(petFields.length) +
      (narrow ? 8 : 12) +
      fieldsHeight(ownerFields.length) +
      (addressField.length > 0 ? fieldsHeight(1) : 0);
    if (!narrow) framed(idTop, idHeight);

    let y = idTop + (narrow ? 0 : 9);
    doc
      .font("Helvetica-Bold")
      .fontSize(narrow ? 14 : 19)
      .fillColor(INK)
      .text(card.pet.name, margin + (narrow ? 0 : 10), y, {
        width: content - 20,
        lineBreak: false,
        ellipsis: true,
      });
    doc
      .font("Helvetica")
      .fontSize(narrow ? 8 : 9.5)
      .fillColor(MUTED)
      .text(
        [label.speciesOrRaw(card.pet.species), card.pet.breed, label.sexOrRaw(card.pet.sex)]
          .filter(Boolean)
          .join("  ·  "),
        margin + (narrow ? 0 : 10),
        doc.y + 1,
        { width: content - 20, lineBreak: false, ellipsis: true }
      );

    y += nameBlock;
    y += fields(petFields, y);

    // Divisor interno: la mascota arriba, quien responde por ella abajo.
    if (narrow) {
      y += 8;
    } else {
      doc.moveTo(margin + 10, y + 5).lineTo(right - 10, y + 5).lineWidth(0.5).strokeColor(LINE).stroke();
      y += 12;
    }

    y += fields(ownerFields, y);
    if (addressField.length > 0) fields(addressField, y);

    doc.y = idTop + idHeight + (narrow ? 8 : 14);

    // ── Los dos registros ────────────────────────────────────────────────────
    // Cuánto mide el pie de verdad. Estimarlo con una constante es lo que empujaba la
    // última nota a una segunda hoja: el texto ocupa distinto en español que en
    // inglés, y distinto en media carta que en A4.
    const notes = narrow
      ? [t("cardNoteRabies"), t("cardNoteTravel")]
      : [t("cardNoteSignature"), t("cardNoteRabies"), t("cardNoteTravel")];
    const noteSize = narrow ? 6.5 : 7;
    doc.font("Helvetica").fontSize(noteSize);
    const footerHeight =
      8 +
      notes.reduce((sum, note) => sum + doc.heightOfString(`·  ${note}`, { width: content }) + 3, 0) +
      (narrow ? 16 : 0) +
      6; // colchón: quedar justo en el margen inferior es quedar a un punto de la hoja 2

    /**
     * Las notas del pie son parte de la hoja, no contenido que sigue a las tablas: van
     * siempre a la misma altura y se repiten en cada página. Dibujarlas al final, a
     * continuación de lo último, es lo que dejaba una segunda hoja con dos renglones
     * de letra chica y nada más — y en un carnet largo las habría dejado fuera.
     */
    const footerTop = height - margin - footerHeight;

    function drawFooter() {
      const saved = doc.y;
      doc.moveTo(margin, footerTop).lineTo(right, footerTop).lineWidth(0.8).strokeColor(LINE).stroke();
      let noteY = footerTop + 8;
      for (const note of notes) {
        doc.font("Helvetica").fontSize(noteSize).fillColor(MUTED).text(`·  ${note}`, margin, noteY, {
          width: content,
        });
        noteY = doc.y + 3;
      }
      doc.y = saved;
    }

    /**
     * Los renglones libres de las dos tablas se reparten de una sola vez, antes de
     * dibujar ninguna. Decidirlo tabla por tabla hacía que la primera se quedara con
     * todo el aire y empujara la segunda a una hoja nueva por un renglón.
     *
     * En papel continuo no hay renglones libres: `height` ahí es una medida de
     * trabajo, y rellenar hasta "abajo" saca metros de rollo.
     */
    function shareBlankRows() {
      if (continuous) return { vaccine: 0, deworming: 0 };
      const slots = Math.floor((footerTop - doc.y - TABLE_CHROME * 2) / ROW_HEIGHT);
      if (slots <= vaccines.length + dewormings.length) return { vaccine: 0, deworming: 0 };

      // La desparasitación se queda con algo más de un tercio de la hoja; el resto va
      // a la vacunación, que es el registro que sigue creciendo año tras año.
      let deworming = Math.max(dewormings.length, MIN_DEWORMING_ROWS, Math.floor(slots * 0.35));
      let vaccine = slots - deworming;
      if (vaccine < vaccines.length) {
        vaccine = vaccines.length;
        deworming = Math.max(dewormings.length, slots - vaccine);
      }
      return {
        vaccine: Math.min(vaccine - vaccines.length, MAX_BLANK_ROWS),
        deworming: Math.min(deworming - dewormings.length, MAX_BLANK_ROWS),
      };
    }

    function table(title: string, columns: Column[], rows: Cell[][], blanks: number) {
      // La posición se fija a mano: `doc.text` ya adelanta `doc.y` por su cuenta, y
      // sumarle el título encima hacía que cada tabla ocupara 12pt más de los que el
      // reparto de renglones había calculado — justo lo que sobra o falta para que la
      // segunda tabla entre en la hoja.
      const titleY = doc.y;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(title, margin, titleY, { width: content });
      doc.y = titleY + TITLE_GAP;

      function headerBand(top: number) {
        doc.rect(margin, top, content, HEAD_HEIGHT).fill(BAND);
        columns.reduce((x, column) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor(MUTED)
            .text(column.header.toUpperCase(), x + 5, top + 5, {
              width: column.width - 10,
              lineBreak: false,
              characterSpacing: 0.4,
            });
          return x + column.width;
        }, margin);
        return top + HEAD_HEIGHT;
      }

      let top = doc.y;
      let rowY = headerBand(top);
      const empty: Cell[] = columns.map(() => null);
      const all = [...rows, ...Array.from({ length: blanks }, () => empty)];

      function closeBlock(bottom: number) {
        columns.reduce((x, column, index) => {
          if (index > 0) {
            doc.moveTo(x, top).lineTo(x, bottom).lineWidth(0.5).strokeColor(LINE).stroke();
          }
          return x + column.width;
        }, margin);
        doc.rect(margin, top, content, bottom - top).lineWidth(0.8).strokeColor(LINE).stroke();
      }

      for (const row of all) {
        // Una mascota con años de historial pasa de hoja; el carnet sigue en la
        // siguiente, con su encabezado repetido como cualquier libreta.
        if (rowY + ROW_HEIGHT > footerTop - 6) {
          closeBlock(rowY);
          doc.addPage();
          drawFooter();
          top = margin;
          rowY = headerBand(top);
        }
        columns.reduce((x, column, index) => {
          const cell = row[index];
          if (cell) {
            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor(cell.overdue ? OVERDUE : INK)
              .text(cell.text, x + 5, rowY + (cell.note ? 5 : 8), {
                width: column.width - 10,
                lineBreak: false,
                ellipsis: true,
              });
            if (cell.note) {
              doc
                .font(cell.overdue ? "Helvetica-Bold" : "Helvetica")
                .fontSize(6)
                .fillColor(cell.overdue ? OVERDUE : MUTED)
                .text(cell.overdue ? cell.note.toUpperCase() : cell.note, x + 5, rowY + 15, {
                  width: column.width - 10,
                  lineBreak: false,
                  characterSpacing: 0.3,
                });
            }
          }
          return x + column.width;
        }, margin);
        rowY += ROW_HEIGHT;
        doc.moveTo(margin, rowY).lineTo(right, rowY).lineWidth(0.5).strokeColor(LINE).stroke();
      }

      closeBlock(rowY);
      doc.y = rowY + AFTER_TABLE_GAP;
    }

    /**
     * Una dosis en el registro: fecha, qué se aplicó, próxima y firma.
     *
     * La casilla del producto va impresa cuando la clínica la registró y **en blanco
     * cuando no** — que es la mitad del historial viejo, cargado antes de que el
     * sistema guardara el dato. La de la firma queda siempre en blanco: esa es física.
     */
    function doseRow(control: {
      productName?: string;
      batchNumber?: string;
      appliedOn: string;
      nextDoseOn: string;
      overdue: boolean;
    }): Cell[] {
      const product = control.productName ?? (control.batchNumber ? "" : undefined);
      return [
        { text: showDate(control.appliedOn) },
        product === undefined
          ? null
          : {
              text: product,
              note: control.batchNumber ? `${t("batchNumber")} ${control.batchNumber}` : undefined,
            },
        {
          text: control.nextDoseOn ? showDate(control.nextDoseOn) : "—",
          note: control.overdue ? t("cardOverdue") : undefined,
          overdue: control.overdue,
        },
        null,
      ];
    }

    if (!continuous) drawFooter();

    if (narrow) {
      // Resumen: sin casillas para llenar, que sobre papel térmico no se pueden usar.
      for (const [title, controls] of [
        [t("cardVaccines"), vaccines],
        [t("cardDewormings"), dewormings],
      ] as const) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(title, margin, doc.y, { width: content });
        doc.moveDown(0.3);
        if (controls.length === 0) {
          doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(t("cardEmpty"), margin, doc.y, { width: content });
        }
        for (const control of controls) {
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(INK)
            .text(
              [showDate(control.appliedOn), control.productName].filter(Boolean).join(" · "),
              margin,
              doc.y,
              { width: content }
            );
          if (control.batchNumber) {
            doc
              .font("Helvetica")
              .fontSize(7)
              .fillColor(MUTED)
              .text(`${t("batchNumber")} ${control.batchNumber}`, margin, doc.y + 1, { width: content });
          }
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(control.overdue ? OVERDUE : MUTED)
            .text(
              `${t("cardNextDose")}: ${control.nextDoseOn ? showDate(control.nextDoseOn) : "—"}` +
                `${control.overdue ? ` (${t("cardOverdue")})` : ""}`,
              margin,
              doc.y + 1,
              { width: content }
            );
          doc.moveDown(0.4);
        }
        doc.moveDown(0.5);
      }
    } else {
      const columns = (middle: string): Column[] => [
        { header: t("date"), width: content * 0.18 },
        { header: middle, width: content * 0.4 },
        { header: t("cardNextDose"), width: content * 0.22 },
        { header: t("cardSignature"), width: content * 0.2 },
      ];

      const blanks = shareBlankRows();
      table(t("cardVaccines"), columns(t("cardVaccineAndBatch")), vaccines.map(doseRow), blanks.vaccine);
      table(t("cardDewormings"), columns(t("cardProductAndDose")), dewormings.map(doseRow), blanks.deworming);
    }

    // ── Pie ──────────────────────────────────────────────────────────────────
    // En rollo continuo no hay "pie de hoja": las notas van a continuación, y la
    // fecha de emisión también, que en hoja va arriba a la derecha.
    if (continuous) {
      rule(LINE, 0.8, 8);
      for (const note of notes) {
        doc.font("Helvetica").fontSize(noteSize).fillColor(MUTED).text(`·  ${note}`, margin, doc.y, {
          width: content,
        });
        doc.y += 3;
      }
      doc.moveDown(0.4);
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(MUTED)
        .text(`${t("cardFooter")} ${showDate(new Date().toISOString().slice(0, 10))}`, margin, doc.y, {
          width: content,
        });
    }
  });
}
