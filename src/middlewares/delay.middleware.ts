import { NextFunction, Request, Response } from "express";

const DEMO_DELAY_MS = Number(process.env.DEMO_DELAY_MS ?? 700);

// Simula la latencia de una consulta real a base de datos, para que el frontend
// muestre sus estados de "cargando" (skeletons/spinners) tal como lo haría en producción.
export function delayMiddleware(req: Request, _res: Response, next: NextFunction) {
  setTimeout(next, DEMO_DELAY_MS);
}
