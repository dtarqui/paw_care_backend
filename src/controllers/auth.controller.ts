import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";
import { clientIp, clientUserAgent } from "../utils/requestContext";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son obligatorios", code: "UsernameAndPasswordRequired" });
    }
    const result = await authService.login(username, password, {
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    res.json(result);
  }),

  requestPasswordRecovery: asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body as { username?: string };
    if (!username) {
      return res.status(400).json({ error: "El nombre de usuario es obligatorio", code: "UsernameRequired" });
    }
    await authService.requestPasswordRecovery(username);
    res.json({
      ok: true,
      message: "Si la cuenta existe y tiene un email registrado, te enviamos un enlace de recuperación.",
    });
  }),

  resetWithToken: asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      return res.status(400).json({ error: "El enlace y la contraseña nueva son obligatorios", code: "TokenAndPasswordRequired" });
    }
    await authService.resetWithToken(token, newPassword);
    res.json({ ok: true });
  }),
};
