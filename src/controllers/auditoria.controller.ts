import { Request, Response } from "express";
import { auditoriaService } from "../services/auditoria.service";
import { asyncHandler } from "../utils/asyncHandler";
import { leerPaginacion } from "../utils/pagination";

export const auditoriaController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = leerPaginacion(req);
    const { items, total } = await auditoriaService.listar(page, pageSize);
    res.json({ registros: items, total, page, pageSize });
  }),
};
