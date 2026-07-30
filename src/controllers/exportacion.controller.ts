import { Request, Response } from "express";
import { generarExportacionCompleta } from "../services/exportacion.service";
import { asyncHandler } from "../utils/asyncHandler";

export const exportacionController = {
  completa: asyncHandler(async (_req: Request, res: Response) => {
    const workbook = await generarExportacionCompleta();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="pawcare-exportacion-completa.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  }),
};
