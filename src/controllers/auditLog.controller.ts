import { Request, Response } from "express";
import { auditLogService } from "../services/auditLog.service";
import { asyncHandler } from "../utils/asyncHandler";
import { readPagination } from "../utils/pagination";

export const auditLogController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = readPagination(req);
    const { items, total } = await auditLogService.list(page, pageSize);
    res.json({ logs: items, total, page, pageSize });
  }),
};
