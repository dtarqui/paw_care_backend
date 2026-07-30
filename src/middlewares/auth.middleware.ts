import { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import { Rol } from "../types";

export interface AuthRequest extends Request {
  usuario?: { id: number; rol: Rol; nombre: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    const payload = authService.verificarToken(header.slice("Bearer ".length));
    req.usuario = { id: payload.sub, rol: payload.rol as Rol, nombre: payload.nombre };
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

export function requireRole(...rolesPermitidos: Rol[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "No tienes permiso para acceder a este recurso" });
    }
    next();
  };
}
