import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { userService } from "../services/user.service";
import { vetInvitationService } from "../services/vetInvitation.service";
import { Role } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { readPagination } from "../utils/pagination";

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = readPagination(req);
    const { items, total } = await userService.list(page, pageSize);
    res.json({ users: items, total, page, pageSize });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json({ user });
  }),

  changeStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: "ACTIVE" | "INACTIVE" };
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      return res.status(400).json({ error: "El estado debe ser ACTIVE o INACTIVE" });
    }
    const user = await userService.changeStatus(id, status, req.user!.id);
    res.json({ user });
  }),

  changeRole: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const { role, licenseNumber, specialty } = req.body as {
      role?: Role;
      licenseNumber?: string;
      specialty?: string;
    };
    if (role !== "ADMIN" && role !== "VET" && role !== "RECEPTIONIST") {
      return res.status(400).json({ error: "Rol inválido" });
    }
    const user = await userService.changeRole(id, role, { licenseNumber, specialty }, req.user!.id);
    res.json({ user });
  }),

  preRegister: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.preRegisterVet(req.body);
    res.status(201).json({ user });
  }),

  changePassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword y newPassword son obligatorios" });
    }
    await userService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ ok: true });
  }),

  resetPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword) {
      return res.status(400).json({ error: "newPassword es obligatorio" });
    }
    await userService.resetPassword(id, newPassword, req.user!.id);
    res.json({ ok: true });
  }),

  invite: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, name } = req.body as { email?: string; name?: string };
    if (!email) {
      return res.status(400).json({ error: "El email es obligatorio" });
    }
    await vetInvitationService.invite(req.user!.id, email, name);
    res.status(201).json({ ok: true });
  }),

  listInvitations: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ invitations: await vetInvitationService.listPending() });
  }),

  cancelInvitation: asyncHandler(async (req: Request, res: Response) => {
    await vetInvitationService.cancel(Number(req.params.id));
    res.status(204).send();
  }),

  validateInvitation: asyncHandler(async (req: Request, res: Response) => {
    const data = await vetInvitationService.validateToken(req.params.token);
    res.json(data);
  }),

  acceptInvitation: asyncHandler(async (req: Request, res: Response) => {
    const user = await vetInvitationService.accept(req.params.token, req.body);
    res.status(201).json({ user });
  }),
};
