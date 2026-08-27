import { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import { Role } from "../types";

export interface AuthRequest extends Request {
  user?: { id: number; role: Role; name: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado", code: "NotAuthenticated" });
  }
  try {
    const payload = authService.verifyToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role as Role, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada", code: "SessionExpired" });
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permiso para acceder a este recurso", code: "Forbidden" });
    }
    next();
  };
}
