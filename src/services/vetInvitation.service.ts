import { vetInvitationTemplate } from "../lib/email-templates";
import { sendEmail } from "../lib/mailer";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { userRepository } from "../repositories/user.repository";
import { vetInvitationRepository } from "../repositories/vetInvitation.repository";
import { vetRepository } from "../repositories/vet.repository";
import { PendingInvitation, PublicUser } from "../types";
import { frontendBaseUrl } from "../utils/url";
import { isValidEmail } from "../utils/validation";
import { DuplicateUserError, InvalidUserDataError, toPublic } from "./user.service";

export class InvalidInvitationError extends Error {
  constructor() {
    super("La invitación no es válida, ya fue usada o expiró");
    this.name = "InvalidInvitationError";
  }
}

export const vetInvitationService = {
  async invite(invitedById: number, email: string, name?: string): Promise<void> {
    if (!email || !isValidEmail(email)) {
      throw new InvalidUserDataError("Ingresa un email válido");
    }
    const inviter = await userRepository.findById(invitedById);
    if (!inviter) throw new InvalidUserDataError("El usuario que invita no existe");
    if (await userRepository.findByEmail(email)) {
      throw new DuplicateUserError("Ya existe una cuenta con ese email");
    }
    if (await vetInvitationRepository.hasPendingForEmail(email)) {
      throw new DuplicateUserError("Ya hay una invitación pendiente para ese email");
    }

    const invitation = await vetInvitationRepository.create(email, name, invitedById);
    const link = `${frontendBaseUrl()}/invitation?token=${invitation.token}`;
    try {
      await sendEmail({
        to: email,
        subject: "Te invitaron a PawCare",
        html: vetInvitationTemplate(name, `${inviter.firstName} ${inviter.paternalLastName}`, link),
      });
    } catch (err) {
      // A diferencia de la recuperación de contraseña, acá el Admin sí debe enterarse
      // del fallo (para reintentar) — pero no puede quedar una invitación "pendiente"
      // que en realidad nunca llegó a la bandeja de nadie.
      await vetInvitationRepository.cancel(invitation.id);
      throw err;
    }

    await auditLogRepository.record({
      actorId: invitedById,
      action: "INVITE_VET",
      entityType: "VetInvitation",
      entityId: invitation.id,
      details: `Invitación enviada a ${email}`,
    });
  },

  listPending(): Promise<PendingInvitation[]> {
    return vetInvitationRepository.findAllPending();
  },

  async cancel(id: number): Promise<void> {
    await vetInvitationRepository.cancel(id);
  },

  async validateToken(token: string): Promise<{ email: string; name?: string }> {
    const invitation = await vetInvitationRepository.findValidByToken(token);
    if (!invitation) throw new InvalidInvitationError();
    return { email: invitation.email, name: invitation.name };
  },

  async accept(
    token: string,
    input: {
      firstName: string;
      paternalLastName: string;
      maternalLastName?: string;
      nationalId: string;
      username: string;
      phone?: string;
      password: string;
      licenseNumber: string;
      specialty: string;
    }
  ): Promise<PublicUser> {
    const invitation = await vetInvitationRepository.findValidByToken(token);
    if (!invitation) throw new InvalidInvitationError();

    if (
      !input.firstName ||
      !input.paternalLastName ||
      !input.nationalId ||
      !input.username ||
      !input.password ||
      !input.licenseNumber ||
      !input.specialty
    ) {
      throw new InvalidUserDataError("Faltan campos obligatorios");
    }
    if (input.password.length < 6) {
      throw new InvalidUserDataError("La contraseña debe tener al menos 6 caracteres");
    }
    if (await userRepository.findByUsername(input.username)) {
      throw new DuplicateUserError("Ese nombre de usuario ya está en uso");
    }
    if (await userRepository.findByNationalId(input.nationalId)) {
      throw new DuplicateUserError("Ya existe un usuario registrado con ese CI");
    }

    // La cuenta queda ACTIVE de una — a diferencia del preregistro público, acá
    // ya fue un Administrador quien decidió invitar a esta persona.
    const newUser = await userRepository.create({
      username: input.username,
      password: input.password,
      firstName: input.firstName,
      paternalLastName: input.paternalLastName,
      maternalLastName: input.maternalLastName,
      nationalId: input.nationalId,
      email: invitation.email,
      phone: input.phone,
      role: "VET",
      status: "ACTIVE",
      selfRegistered: false,
    });

    await vetRepository.create({
      userId: newUser.id,
      licenseNumber: input.licenseNumber,
      specialty: input.specialty,
    });

    await vetInvitationRepository.markAccepted(invitation.id);

    return toPublic(newUser);
  },
};
