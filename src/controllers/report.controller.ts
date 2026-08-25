import { Request, Response } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { ReportFilters, reportService } from "../services/report.service";
import { PaymentMethod } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

function filtersFromQuery(req: Request): ReportFilters {
  return {
    from: req.query.from ? String(req.query.from) : undefined,
    to: req.query.to ? String(req.query.to) : undefined,
    serviceType: req.query.serviceType ? String(req.query.serviceType) : undefined,
    paymentMethod: req.query.paymentMethod ? (String(req.query.paymentMethod) as PaymentMethod) : undefined,
  };
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
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte");

    // Los `header` van en español (los ve quien abre el Excel); las `key` en inglés.
    if (type === "revenue-by-service") {
      sheet.columns = [
        { header: "Tipo de servicio", key: "serviceType", width: 30 },
        { header: "Cantidad", key: "count", width: 12 },
        { header: "Monto (Bs.)", key: "amount", width: 15 },
      ];
      sheet.addRows(await reportService.revenueByServiceType(filters));
    } else {
      sheet.columns = [
        { header: "Fecha", key: "date", width: 22 },
        { header: "Mascota", key: "pet", width: 18 },
        { header: "Propietario", key: "owner", width: 25 },
        { header: "Tipo de servicio", key: "serviceType", width: 20 },
        { header: "Monto (Bs.)", key: "consultationFee", width: 14 },
        { header: "Estado de pago", key: "paymentStatus", width: 16 },
      ];
      sheet.addRows(await reportService.visitsByPeriod(filters));
    }
    sheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-${type}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }),

  exportPdf: asyncHandler(async (req: Request, res: Response) => {
    const type = String(req.query.type ?? "visits");
    const filters = filtersFromQuery(req);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-${type}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text("PawCare — Reporte", { align: "left" });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `Tipo: ${type === "revenue-by-service" ? "Ingresos por tipo de servicio" : "Atenciones por período"}` +
          (filters.from || filters.to ? ` · ${filters.from ?? "…"} a ${filters.to ?? "…"}` : "")
      );
    doc.moveDown();
    doc.fillColor("#000");

    if (type === "revenue-by-service") {
      const groups = await reportService.revenueByServiceType(filters);
      drawTable(
        doc,
        ["Tipo de servicio", "Cantidad", "Monto (Bs.)"],
        groups.map((g) => [g.serviceType, String(g.count), g.amount.toFixed(2)])
      );
    } else {
      const visits = await reportService.visitsByPeriod(filters);
      drawTable(
        doc,
        ["Fecha", "Mascota", "Tipo de servicio", "Monto", "Estado"],
        visits.map((v) => [
          v.date.slice(0, 10),
          v.pet,
          v.serviceType,
          v.consultationFee.toFixed(2),
          v.paymentStatus,
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
