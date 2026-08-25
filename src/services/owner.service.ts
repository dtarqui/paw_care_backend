import { ownerRepository } from "../repositories/owner.repository";
import { OwnerWithPets } from "../types";

export class OwnerNotFoundError extends Error {
  constructor() {
    super("El propietario solicitado no existe");
    this.name = "OwnerNotFoundError";
  }
}

export class InvalidOwnerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOwnerDataError";
  }
}

interface UpdateOwnerInput {
  firstName?: string;
  paternalLastName?: string;
  phone?: string;
  address?: string;
}

export const ownerService = {
  findByNationalId(nationalId: string) {
    return ownerRepository.findByNationalId(nationalId);
  },

  list(): Promise<OwnerWithPets[]> {
    return ownerRepository.findAll();
  },

  async update(id: number, input: UpdateOwnerInput) {
    if (!(await ownerRepository.findById(id))) {
      throw new OwnerNotFoundError();
    }
    if (input.firstName !== undefined && !input.firstName.trim()) {
      throw new InvalidOwnerDataError("El nombre no puede quedar vacío");
    }
    if (input.paternalLastName !== undefined && !input.paternalLastName.trim()) {
      throw new InvalidOwnerDataError("El apellido paterno no puede quedar vacío");
    }

    // El CI es la clave usada para buscar propietarios en toda la app (HU2/HU3) —
    // no se expone como editable a propósito, para no romper esas búsquedas.
    return ownerRepository.update(id, {
      firstName: input.firstName,
      paternalLastName: input.paternalLastName,
      phone: input.phone,
      address: input.address,
    });
  },
};
