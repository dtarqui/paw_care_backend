import { Request, Response } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { FiltrosReporte, reporteService } from "../services/reporte.service";
import { MetodoPago } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

function filtrosDesdeQuery(req: Request): FiltrosReporte {
  return {
    desde: req.query.desde ? String(req.query.desde) : undefined,
    hasta: req.query.hasta ? String(req.query.hasta) : undefined,
    tipoServicio: req.query.tipoServicio ? String(req.query.tipoServicio) : undefined,
    metodoPago: req.query.metodoPago ? (String(req.query.metodoPago) as MetodoPago) : undefined,
  };
}

export const reporteController = {
  // HU7
  ingresos: asyncHandler(async (req: Request, res: Response) => {
    res.json(reporteService.ingresos(filtrosDesdeQuery(req)));
  }),

  // HU8 — datos para pantalla + gráfico
  general: asyncHandler(async (req: Request, res: Response) => {
    const tipo = String(req.query.tipo ?? "atenciones");
    const filtros = filtrosDesdeQuery(req);
    if (tipo === "ingresos-por-servicio") {
      res.json({ tipo, grupos: reporteService.ingresosPorServicio(filtros) });
    } else {
      res.json({ tipo, atenciones: reporteService.atencionesPorPeriodo(filtros) });
    }
  }),

  exportarExcel: asyncHandler(async (req: Request, res: Response) => {
    const tipo = String(req.query.tipo ?? "atenciones");
    const filtros = filtrosDesdeQuery(req);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte");

    if (tipo === "ingresos-por-servicio") {
      sheet.columns = [
        { header: "Tipo de servicio", key: "tipoServicio", width: 30 },
        { header: "Cantidad", key: "cantidad", width: 12 },
        { header: "Monto (Bs.)", key: "monto", width: 15 },
      ];
      sheet.addRows(reporteService.ingresosPorServicio(filtros));
    } else {
      sheet.columns = [
        { header: "Fecha", key: "fecha", width: 22 },
        { header: "Mascota", key: "mascota", width: 18 },
        { header: "Propietario", key: "propietario", width: 25 },
        { header: "Tipo de servicio", key: "tipoServicio", width: 20 },
        { header: "Monto (Bs.)", key: "montoConsulta", width: 14 },
        { header: "Estado de pago", key: "estadoPago", width: 16 },
      ];
      sheet.addRows(reporteService.atencionesPorPeriodo(filtros));
    }
    sheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-${tipo}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }),

  exportarPdf: asyncHandler(async (req: Request, res: Response) => {
    const tipo = String(req.query.tipo ?? "atenciones");
    const filtros = filtrosDesdeQuery(req);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-${tipo}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text("PawCare — Reporte", { align: "left" });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `Tipo: ${tipo === "ingresos-por-servicio" ? "Ingresos por tipo de servicio" : "Atenciones por período"}` +
          (filtros.desde || filtros.hasta ? ` · ${filtros.desde ?? "…"} a ${filtros.hasta ?? "…"}` : "")
      );
    doc.moveDown();
    doc.fillColor("#000");

    if (tipo === "ingresos-por-servicio") {
      const grupos = reporteService.ingresosPorServicio(filtros);
      dibujarTabla(
        doc,
        ["Tipo de servicio", "Cantidad", "Monto (Bs.)"],
        grupos.map((g) => [g.tipoServicio, String(g.cantidad), g.monto.toFixed(2)])
      );
    } else {
      const atenciones = reporteService.atencionesPorPeriodo(filtros);
      dibujarTabla(
        doc,
        ["Fecha", "Mascota", "Tipo de servicio", "Monto", "Estado"],
        atenciones.map((a) => [a.fecha.slice(0, 10), a.mascota, a.tipoServicio, a.montoConsulta.toFixed(2), a.estadoPago])
      );
    }

    doc.end();
  }),
};

function dibujarTabla(doc: InstanceType<typeof PDFDocument>, encabezados: string[], filas: string[][]) {
  const anchoColumna = 500 / encabezados.length;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(10);
  encabezados.forEach((texto, i) => doc.text(texto, 40 + i * anchoColumna, y, { width: anchoColumna }));
  y += 18;
  doc.moveTo(40, y).lineTo(540, y).strokeColor("#cccccc").stroke();
  y += 6;

  doc.font("Helvetica").fontSize(9);
  for (const fila of filas) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    fila.forEach((texto, i) => doc.text(texto, 40 + i * anchoColumna, y, { width: anchoColumna }));
    y += 16;
  }
  doc.y = y;
}
