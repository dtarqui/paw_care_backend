import { Request, Response } from "express";
import { usuarioService } from "../services/usuario.service";
import { Rol } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { leerPaginacion } from "../utils/pagination";

export const usuarioController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = leerPaginacion(req);
    const { items, total } = await usuarioService.listar(page, pageSize);
    res.json({ usuarios: items, total, page, pageSize });
  }),

  crear: asyncHandler(async (req: Request, res: Response) => {
    const usuario = await usuarioService.crear(req.body);
    res.status(201).json({ usuario });
  }),

  cambiarEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado } = req.body as { estado?: "ACTIVO" | "INACTIVO" };
    if (estado !== "ACTIVO" && estado !== "INACTIVO") {
      return res.status(400).json({ error: "El estado debe ser ACTIVO o INACTIVO" });
    }
    const usuario = await usuarioService.cambiarEstado(id, estado);
    res.json({ usuario });
  }),

  cambiarRol: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { rol, matricula, especialidad } = req.body as { rol?: Rol; matricula?: string; especialidad?: string };
    if (rol !== "ADMINISTRADOR" && rol !== "VETERINARIO" && rol !== "RECEPCIONISTA") {
      return res.status(400).json({ error: "Rol inválido" });
    }
    const usuario = await usuarioService.cambiarRol(id, rol, { matricula, especialidad });
    res.json({ usuario });
  }),
};
