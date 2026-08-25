import { Request, Response } from "express";
import { generateFullExport } from "../services/export.service";
import { asyncHandler } from "../utils/asyncHandler";

export const exportController = {
  full: asyncHandler(async (_req: Request, res: Response) => {
    const workbook = await generateFullExport();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="pawcare-exportacion-completa.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  }),
};
