import bcrypt from "bcryptjs";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { userRepository } from "../repositories/user.repository";
import { vetRepository } from "../repositories/vet.repository";
import { PublicUser, Role, User } from "../types";
import { isValidEmail } from "../utils/validation";

export class InvalidUserDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserDataError";
  }
}

export class DuplicateUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateUserError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("El usuario solicitado no existe");
    this.name = "UserNotFoundError";
  }
}

export class WrongCurrentPasswordError extends Error {
  constructor() {
    super("La contraseña actual no es correcta");
    this.name = "WrongCurrentPasswordError";
  }
}

interface NewUserInput {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  nationalId: string;
  email?: string;
  username: string;
  phone?: string;
  role: Role;
  password: string;
  licenseNumber?: string; // obligatorio si role = VET
  specialty?: string; // obligatorio si role = VET
}

export function toPublic(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export const userService = {
  async list(page = 1, pageSize = 20) {
    const paginated = await userRepository.findAllPaginated(page, pageSize);
    return { ...paginated, items: paginated.items.map(toPublic) };
  },

  async create(input: NewUserInput): Promise<PublicUser> {
    if (
      !input.firstName ||
      !input.paternalLastName ||
      !input.nationalId ||
      !input.username ||
      !input.role ||
      !input.password
    ) {
      throw new InvalidUserDataError("Faltan campos obligatorios");
    }
    if (await userRepository.findByUsername(input.username)) {
      throw new DuplicateUserError("Ese nombre de usuario ya está en uso");
    }
    if (await userRepository.findByNationalId(input.nationalId)) {
      throw new DuplicateUserError("Ya existe un usuario registrado con ese CI");
    }
    if (input.role === "VET" && (!input.licenseNumber || !input.specialty)) {
      throw new InvalidUserDataError("Matrícula y especialidad son obligatorias para un Veterinario");
    }
    if (input.email) {
      if (!isValidEmail(input.email)) {
        throw new InvalidUserDataError("El email no es válido");
      }
      if (await userRepository.findByEmail(input.email)) {
        throw new DuplicateUserError("Ya existe un usuario registrado con ese email");
      }
    }

    const newUser = await userRepository.create({
      username: input.username,
      password: input.password,
      firstName: input.firstName,
      paternalLastName: input.paternalLastName,
      maternalLastName: input.maternalLastName,
      nationalId: input.nationalId,
      email: input.email,
      phone: input.phone,
      role: input.role,
    });

    // Espejo del modelo real: Vet.userId 1-a-1 con User (database/MODELO_DATOS.md).
    if (input.role === "VET") {
      await vetRepository.create({
        userId: newUser.id,
        licenseNumber: input.licenseNumber!,
        specialty: input.specialty!,
      });
    }

    return toPublic(newUser);
  },

  /** Preregistro público (sin auth) — un veterinario nuevo pide su cuenta, queda
   * INACTIVE hasta que un Administrador la apruebe (mismo botón "Activar" que ya
   * existe en Gestión de Usuarios). `selfRegistered` lo distingue de una cuenta
   * que un Admin desactivó a propósito, para que la UI pueda mostrar "Pendiente
   * de aprobación" en vez de simplemente "Inactivo". */
  async preRegisterVet(input: {
    firstName: string;
    paternalLastName: string;
    maternalLastName?: string;
    nationalId: string;
    email: string;
    username: string;
    phone?: string;
    password: string;
    licenseNumber: string;
    specialty: string;
  }): Promise<PublicUser> {
    if (
      !input.firstName ||
      !input.paternalLastName ||
      !input.nationalId ||
      !input.email ||
      !input.username ||
      !input.password ||
      !input.licenseNumber ||
      !input.specialty
    ) {
      throw new InvalidUserDataError("Faltan campos obligatorios");
    }
    if (!isValidEmail(input.email)) {
      throw new InvalidUserDataError("El email no es válido");
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
    if (await userRepository.findByEmail(input.email)) {
      throw new DuplicateUserError("Ya existe un usuario registrado con ese email");
    }

    const newUser = await userRepository.create({
      username: input.username,
      password: input.password,
      firstName: input.firstName,
      paternalLastName: input.paternalLastName,
      maternalLastName: input.maternalLastName,
      nationalId: input.nationalId,
      email: input.email,
      phone: input.phone,
      role: "VET",
      status: "INACTIVE",
      selfRegistered: true,
    });

    await vetRepository.create({
      userId: newUser.id,
      licenseNumber: input.licenseNumber,
      specialty: input.specialty,
      status: "INACTIVE",
    });

    return toPublic(newUser);
  },

  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new WrongCurrentPasswordError();
    }
    if (newPassword.length < 6) {
      throw new InvalidUserDataError("La contraseña nueva debe tener al menos 6 caracteres");
    }
    await userRepository.updatePassword(id, newPassword);
  },

  /** Restablecimiento por un Administrador — para cuando un usuario perdió su
   * contraseña y no puede iniciar sesión para cambiarla él mismo (o no tiene email
   * registrado y no puede usar la recuperación por correo). El Admin le comunica
   * la contraseña nueva directamente — no se envía por email/SMS. */
  async resetPassword(id: number, newPassword: string, actorId?: number): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (newPassword.length < 6) {
      throw new InvalidUserDataError("La contraseña nueva debe tener al menos 6 caracteres");
    }
    await userRepository.updatePassword(id, newPassword);

    if (actorId) {
      await auditLogRepository.record({
        actorId,
        action: "RESET_PASSWORD",
        entityType: "User",
        entityId: id,
        details: `Contraseña restablecida para ${user.firstName} ${user.paternalLastName} (${user.username})`,
      });
    }
  },

  async changeStatus(id: number, status: "ACTIVE" | "INACTIVE", actorId?: number): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    const wasPendingApproval = user.selfRegistered && user.status === "INACTIVE" && status === "ACTIVE";
    const updated = await userRepository.updateStatus(id, status);

    // Si tiene un Vet vinculado, se mantiene sincronizado — desactivar el
    // login también debería sacarlo de los selects de agendar/atender.
    const vet = await vetRepository.findByUserId(id);
    if (vet) {
      await vetRepository.updateStatus(vet.id, status);
    }

    if (actorId) {
      const fullName = `${user.firstName} ${user.paternalLastName} (${user.username})`;
      const details = wasPendingApproval
        ? `Aprobación de preregistro de ${fullName}`
        : status === "ACTIVE"
          ? `Reactivación de ${fullName}`
          : `Desactivación de ${fullName}`;
      await auditLogRepository.record({
        actorId,
        action: status === "ACTIVE" ? "ACTIVATE_ACCOUNT" : "DEACTIVATE_ACCOUNT",
        entityType: "User",
        entityId: id,
        details,
      });
    }

    return toPublic(updated);
  },

  async changeRole(
    id: number,
    role: Role,
    vetData?: { licenseNumber?: string; specialty?: string },
    actorId?: number
  ): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }

    const linkedVet = await vetRepository.findByUserId(id);

    if (role === "VET") {
      if (linkedVet) {
        // Ya tuvo un registro de Vet antes (p.ej. se lo cambió de rol y ahora vuelve) — se reactiva
        // en vez de crear uno duplicado (Vet.userId es único).
        await vetRepository.updateStatus(linkedVet.id, "ACTIVE");
      } else {
        if (!vetData?.licenseNumber || !vetData?.specialty) {
          throw new InvalidUserDataError(
            "Matrícula y especialidad son obligatorias para convertir a un usuario en Veterinario"
          );
        }
        await vetRepository.create({
          userId: id,
          licenseNumber: vetData.licenseNumber,
          specialty: vetData.specialty,
        });
      }
    } else if (linkedVet) {
      // Deja de ser veterinario: no se borra el registro (Appointment/MedicalVisit lo referencian
      // con onDelete Restrict) — se desactiva, igual que changeStatus, para sacarlo de los selects.
      await vetRepository.updateStatus(linkedVet.id, "INACTIVE");
    }

    const updated = await userRepository.updateRole(id, role);

    if (actorId) {
      await auditLogRepository.record({
        actorId,
        action: "CHANGE_ROLE",
        entityType: "User",
        entityId: id,
        details: `${user.firstName} ${user.paternalLastName} (${user.username}): ${user.role} → ${role}`,
      });
    }

    return toPublic(updated);
  },
};
