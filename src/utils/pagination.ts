import { Request } from "express";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

export function leerPaginacion(req: Request): { page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(req.query.pageSize) || PAGE_SIZE_DEFAULT));
  return { page, pageSize };
}
