import { Request, Response } from "express";
import { buildVaccinationCardPdf } from "../lib/vaccinationCardPdf";
import { preventiveControlService } from "../services/preventiveControl.service";
import { asyncHandler } from "../utils/asyncHandler";
import { labelsFor, readLanguage } from "../utils/labels";
import { readPaperSize } from "../utils/paperSize";

export const preventiveControlController = {
  history: asyncHandler(async (req: Request, res: Response) => {
    const petId = Number(req.params.id);
    res.json({ controls: await preventiveControlService.petHistory(petId) });
  }),

  upcoming: asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    res.json({ controls: await preventiveControlService.upcoming(days) });
  }),

  /** El carnet en PDF: el documento que el dueño se lleva y que le piden en otra
   * clínica, una guardería o al cruzar una frontera con el animal. */
  vaccinationCard: asyncHandler(async (req: Request, res: Response) => {
    const card = await preventiveControlService.vaccinationCard(Number(req.params.id));
    const language = readLanguage(req);
    const label = labelsFor(language);
    // El nombre lleva la mascota: en la carpeta de descargas, "carnet-Luna.pdf" se
    // encuentra y "carnet.pdf" no.
    const slug = card.pet.name.normalize("NFD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${label.text("fileCard")}-${slug}.pdf"`);

    const doc = buildVaccinationCardPdf(card, label, language, readPaperSize(req));
    doc.pipe(res);
    doc.end();
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const control = await preventiveControlService.create(req.body);
    res.status(201).json({ control });
  }),
};
