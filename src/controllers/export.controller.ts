import { Request, Response } from "express";
import { generateFullExport } from "../services/export.service";
import { asyncHandler } from "../utils/asyncHandler";
import { labelsFor, readLanguage } from "../utils/labels";

export const exportController = {
  full: asyncHandler(async (req: Request, res: Response) => {
    const label = labelsFor(readLanguage(req));
    const workbook = await generateFullExport(readLanguage(req));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    // El nombre del archivo también va traducido: es lo primero que ve quien lo
    // abre en su carpeta de descargas.
    res.setHeader("Content-Disposition", `attachment; filename="${label.text("fileFullExport")}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }),
};
