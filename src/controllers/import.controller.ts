import { Request, Response } from "express";
import multer from "multer";
import { importService } from "../services/import.service";
import { asyncHandler } from "../utils/asyncHandler";

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

export const importController = {
  clients: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Debes adjuntar un archivo .xlsx" });
    }
    const result = await importService.importClients(req.file.buffer);
    res.json(result);
  }),
};
