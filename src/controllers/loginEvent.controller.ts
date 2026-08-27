import { Request, Response } from "express";
import { loginEventService } from "../services/loginEvent.service";
import { asyncHandler } from "../utils/asyncHandler";
import { readPagination } from "../utils/pagination";

/** `?outcome=success|failed` filtra la lista; cualquier otro valor (o ninguno) trae
 * todo. `?username=` busca por coincidencia parcial, sin distinguir mayúsculas. */
function readFilters(req: Request) {
  const outcome = String(req.query.outcome ?? "");
  const username = String(req.query.username ?? "").trim();
  return {
    successful: outcome === "success" ? true : outcome === "failed" ? false : undefined,
    username: username || undefined,
  };
}

export const loginEventController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = readPagination(req);
    const [{ items, total }, summary] = await Promise.all([
      loginEventService.list(page, pageSize, readFilters(req)),
      loginEventService.summary(),
    ]);
    res.json({ events: items, total, page, pageSize, summary });
  }),
};
