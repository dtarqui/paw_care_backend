import { Request, Response } from "express";
import { searchService } from "../services/search/search.service";
import { asyncHandler } from "../utils/asyncHandler";

export const searchController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const term = String(req.query.q ?? "");
    res.json({ results: await searchService.search(term) });
  }),
};
