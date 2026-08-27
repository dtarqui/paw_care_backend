import { Request } from "express";

/**
 * De dónde vino un request: IP del cliente y navegador.
 *
 * En producción la API corre detrás del proxy de Vercel, así que `req.socket` ve la
 * IP del proxy y no la de la persona. La IP real llega en `X-Forwarded-For`, que
 * Express solo interpreta si la app declara `trust proxy` — se configura en `app.ts`.
 * Sin eso, este helper devolvería siempre la misma IP para todo el mundo.
 */
export function clientIp(req: Request): string | undefined {
  // `req.ip` ya resuelve X-Forwarded-For cuando `trust proxy` está configurado.
  const ip = req.ip ?? req.socket.remoteAddress ?? undefined;
  if (!ip) return undefined;
  // Las IPv4 llegan mapeadas a IPv6 (`::ffff:190.1.2.3`) y así no se leen bien.
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

export function clientUserAgent(req: Request): string | undefined {
  const agent = req.headers["user-agent"];
  return typeof agent === "string" && agent.trim() ? agent.trim() : undefined;
}
