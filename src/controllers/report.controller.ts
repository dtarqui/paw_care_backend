import { Request, Response } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { ReportFilters, reportService } from "../services/report.service";
import { PaymentMethod } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { Labels, labelsFor, readLanguage } from "../utils/labels";

function filtersFromQuery(req: Request): ReportFilters {
  return {
    from: req.query.from ? String(req.query.from) : undefined,
    to: req.query.to ? String(req.query.to) : undefined,
    serviceType: req.query.serviceType ? String(req.query.serviceType) : undefined,
    paymentMethod: req.query.paymentMethod ? (String(req.query.paymentMethod) as PaymentMethod) : undefined,
  };
}

/** Nombre del archivo descargado, en el idioma pedido. Cae al reporte de atenciones
 * si llega un tipo desconocido, que es el mismo default que usa el resto del módulo. */
function fileNameFor(t: Labels["text"], type: string): string {
  return type === "revenue-by-service" ? t("file-revenue-by-service") : t("file-visits");
}

export const reportController = {
  // HU7
  revenue: asyncHandler(async (req: Request, res: Response) => {
    res.json(await reportService.revenue(filtersFromQuery(req)));
  }),

  // HU8 — datos para pantalla + gráfico
  general: asyncHandler(async (req: Request, res: Response) => {
    const type = String(req.query.type ?? "visits");
    const filters = filtersFromQuery(req);
    if (type === "revenue-by-service") {
      res.json({ type, groups: await reportService.revenueByServiceType(filters) });
    } else {
      res.json({ type, visits: await reportService.visitsByPeriod(filters) });
    }
  }),

  exportExcel: asyncHandler(async (req: Request, res: Response) => {
    const type = String(req.query.type ?? "visits");
    const filters = filtersFromQuery(req);
    const label = labelsFor(readLanguage(req));
    const t = label.text;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t("sheetReport"));

    // Los `header` los pone `utils/labels.ts` en el idioma que pidió el navegador
    // (los ve quien abre el Excel); las `key` van en inglés, como el resto del código.
    if (type === "revenue-by-service") {
      sheet.columns = [
        { header: t("serviceType"), key: "serviceType", width: 30 },
        { header: t("quantity"), key: "count", width: 12 },
        { header: t("amountBs"), key: "amount", width: 15 },
      ];
      sheet.addRows(await reportService.revenueByServiceType(filters));
    } else {
      sheet.columns = [
        { header: t("date"), key: "date", width: 22 },
        { header: t("pet"), key: "pet", width: 18 },
        { header: t("owner"), key: "owner", width: 25 },
        { header: t("serviceType"), key: "serviceType", width: 20 },
        { header: t("amountBs"), key: "consultationFee", width: 14 },
        { header: t("paymentStatus"), key: "paymentStatus", width: 16 },
      ];
      const visits = await reportService.visitsByPeriod(filters);
      // El estado viaja en inglés (PENDING/PAID); en la planilla se lee en español.
      sheet.addRows(visits.map((v) => ({ ...v, paymentStatus: label.visitPaymentStatus(v.paymentStatus) })));
    }
    sheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileNameFor(t, type)}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }),

  exportPdf: asyncHandler(async (req: Request, res: Response) => {
    const type = String(req.query.type ?? "visits");
    const filters = filtersFromQuery(req);
    const label = labelsFor(readLanguage(req));
    const t = label.text;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileNameFor(t, type)}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text(t("reportTitle"), { align: "left" });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `${t("reportKind")}: ${
          type === "revenue-by-service" ? t("reportRevenueByService") : t("reportVisits")
        }` +
          (filters.from || filters.to
            ? ` · ${filters.from ?? "…"} ${t("reportTo")} ${filters.to ?? "…"}`
            : "")
      );
    doc.moveDown();
    doc.fillColor("#000");

    if (type === "revenue-by-service") {
      const groups = await reportService.revenueByServiceType(filters);
      drawTable(
        doc,
        [t("serviceType"), t("quantity"), t("amountBs")],
        groups.map((g) => [g.serviceType, String(g.count), g.amount.toFixed(2)])
      );
    } else {
      const visits = await reportService.visitsByPeriod(filters);
      drawTable(
        doc,
        [t("date"), t("pet"), t("serviceType"), t("amount"), t("status")],
        visits.map((v) => [
          v.date.slice(0, 10),
          v.pet,
          v.serviceType,
          v.consultationFee.toFixed(2),
          label.visitPaymentStatus(v.paymentStatus),
        ])
      );
    }

    doc.end();
  }),
};

function drawTable(doc: InstanceType<typeof PDFDocument>, headers: string[], rows: string[][]) {
  const columnWidth = 500 / headers.length;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(10);
  headers.forEach((text, i) => doc.text(text, 40 + i * columnWidth, y, { width: columnWidth }));
  y += 18;
  doc.moveTo(40, y).lineTo(540, y).strokeColor("#cccccc").stroke();
  y += 6;

  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    row.forEach((text, i) => doc.text(text, 40 + i * columnWidth, y, { width: columnWidth }));
    y += 16;
  }
  doc.y = y;
}
