import { Request, Response } from "express";
import multer from "multer";
import { importacionService } from "../services/importacion.service";
import { asyncHandler } from "../utils/asyncHandler";

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("archivo");

export const importacionController = {
  clientes: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Debes adjuntar un archivo .xlsx" });
    }
    const resultado = await importacionService.importarClientes(req.file.buffer);
    res.json(resultado);
  }),
};
