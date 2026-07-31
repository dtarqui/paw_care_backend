import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    }
    const resultado = await authService.login(username, password);
    res.json(resultado);
  }),

  solicitarRecuperacion: asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body as { username?: string };
    if (!username) {
      return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
    }
    await authService.solicitarRecuperacion(username);
    res.json({ ok: true, mensaje: "Si la cuenta existe y tiene un email registrado, te enviamos un enlace de recuperación." });
  }),

  restablecerConToken: asyncHandler(async (req: Request, res: Response) => {
    const { token, passwordNuevo } = req.body as { token?: string; passwordNuevo?: string };
    if (!token || !passwordNuevo) {
      return res.status(400).json({ error: "token y passwordNuevo son obligatorios" });
    }
    await authService.restablecerConToken(token, passwordNuevo);
    res.json({ ok: true });
  }),
};
