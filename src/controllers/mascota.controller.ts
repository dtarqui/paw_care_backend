import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { mascotaService } from "../services/mascota.service";
import { asyncHandler } from "../utils/asyncHandler";
import { leerPaginacion } from "../utils/pagination";

export const mascotaController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = leerPaginacion(req);
    const soloActivas = req.query.activas !== "false";
    const { items, total } = await mascotaService.listar(page, pageSize, soloActivas);
    res.json({ mascotas: items, total, page, pageSize });
  }),

  buscar: asyncHandler(async (req: Request, res: Response) => {
    const ci = String(req.query.ci ?? "");
    if (!ci) {
      return res.status(400).json({ error: "El parámetro ci es obligatorio" });
    }
    res.json({ mascotas: await mascotaService.buscarPorCiPropietario(ci) });
  }),

  crear: asyncHandler(async (req: Request, res: Response) => {
    const mascota = await mascotaService.crear(req.body);
    res.status(201).json({ mascota });
  }),

  detalle: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    res.json({ mascota: await mascotaService.detalle(id) });
  }),

  actualizar: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const mascota = await mascotaService.actualizar(id, req.body, req.usuario!.id);
    res.json({ mascota });
  }),

  historial: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    res.json({ eventos: await mascotaService.historial(id) });
  }),

  cambiarEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado } = req.body as { estado?: "ACTIVO" | "INACTIVO" };
    if (estado !== "ACTIVO" && estado !== "INACTIVO") {
      return res.status(400).json({ error: "El estado debe ser ACTIVO o INACTIVO" });
    }
    const mascota = await mascotaService.cambiarEstado(id, estado);
    res.json({ mascota });
  }),
};
