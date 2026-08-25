import { appointmentRepository } from "../repositories/appointment.repository";
import { ownerRepository } from "../repositories/owner.repository";
import { petRepository } from "../repositories/pet.repository";
import { Pet, PetHistoryEvent, RecordStatus } from "../types";
import { medicalVisitService } from "./medicalVisit.service";
import { preventiveControlService } from "./preventiveControl.service";

export class InvalidPetDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPetDataError";
  }
}

export class DuplicatePetError extends Error {
  constructor() {
    super("Esta mascota ya está registrada para este propietario");
    this.name = "DuplicatePetError";
  }
}

export class PetNotFoundError extends Error {
  constructor() {
    super("La mascota solicitada no existe");
    this.name = "PetNotFoundError";
  }
}

interface NewPetInput {
  name: string;
  species: string;
  breed?: string;
  sex: "Macho" | "Hembra";
  birthDate?: string;
  weight?: number;
  owner: {
    nationalId: string;
    firstName?: string;
    paternalLastName?: string;
    phone?: string;
  };
}

interface UpdatePetInput {
  name?: string;
  species?: string;
  breed?: string;
  sex?: "Macho" | "Hembra";
  birthDate?: string;
  weight?: number;
}

// Etiquetas en español: se guardan tal cual en la bitácora de cambios (PetChange.field)
// y se muestran así en la línea de tiempo de la ficha de mascota.
const FIELD_LABELS: Record<keyof UpdatePetInput, string> = {
  name: "Nombre",
  species: "Especie",
  breed: "Raza",
  sex: "Sexo",
  birthDate: "Fecha de nacimiento",
  weight: "Peso",
};

export const petService = {
  list(page = 1, pageSize = 20, activeOnly = true) {
    return petRepository.findAllPaginated(page, pageSize, activeOnly);
  },

  findByOwnerNationalId(nationalId: string): Promise<Pet[]> {
    return petRepository.findByOwnerNationalId(nationalId);
  },

  async create(input: NewPetInput): Promise<Pet> {
    if (!input.name || !input.species || !input.sex || !input.owner?.nationalId) {
      throw new InvalidPetDataError("Faltan datos obligatorios de la mascota o el propietario");
    }

    // Dado que existe dueño registrado (mismo CI), se reutiliza en vez de duplicarlo.
    let owner = await ownerRepository.findByNationalId(input.owner.nationalId);
    if (!owner) {
      if (!input.owner.firstName || !input.owner.paternalLastName) {
        throw new InvalidPetDataError("Faltan datos del propietario nuevo (nombre y apellido paterno)");
      }
      owner = await ownerRepository.create({
        nationalId: input.owner.nationalId,
        firstName: input.owner.firstName,
        paternalLastName: input.owner.paternalLastName,
        phone: input.owner.phone,
      });
    }

    if (await petRepository.existsForOwner(owner.id, input.name, input.species)) {
      throw new DuplicatePetError();
    }

    return petRepository.create({
      ownerId: owner.id,
      name: input.name,
      species: input.species,
      breed: input.breed,
      sex: input.sex,
      birthDate: input.birthDate,
      weight: input.weight,
    });
  },

  async detail(id: number): Promise<Pet> {
    const pet = await petRepository.findById(id);
    if (!pet) throw new PetNotFoundError();
    return pet;
  },

  async update(id: number, input: UpdatePetInput, userId?: number): Promise<Pet> {
    const current = await petRepository.findById(id);
    if (!current) throw new PetNotFoundError();

    if (input.name !== undefined && !input.name.trim()) {
      throw new InvalidPetDataError("El nombre no puede quedar vacío");
    }
    if (input.species !== undefined && !input.species.trim()) {
      throw new InvalidPetDataError("La especie no puede quedar vacía");
    }

    const changeLog: { field: string; oldValue?: string; newValue?: string }[] = [];
    for (const field of Object.keys(FIELD_LABELS) as (keyof UpdatePetInput)[]) {
      if (input[field] === undefined) continue;
      const oldValue = String(current[field] ?? "");
      const newValue = String(input[field] ?? "");
      if (oldValue !== newValue) {
        changeLog.push({ field: FIELD_LABELS[field], oldValue, newValue });
      }
    }

    const updated = await petRepository.update(id, input);
    if (changeLog.length > 0) {
      await petRepository.recordChanges(id, changeLog, userId);
    }
    return updated;
  },

  async changeStatus(id: number, status: RecordStatus): Promise<Pet> {
    if (!(await petRepository.findById(id))) {
      throw new PetNotFoundError();
    }
    return petRepository.updateStatus(id, status);
  },

  async history(id: number): Promise<PetHistoryEvent[]> {
    if (!(await petRepository.findById(id))) {
      throw new PetNotFoundError();
    }

    const [visits, controls, appointments, changes] = await Promise.all([
      medicalVisitService.petHistory(id),
      preventiveControlService.petHistory(id),
      appointmentRepository.findByPetId(id),
      petRepository.changeHistory(id),
    ]);

    const events: PetHistoryEvent[] = [
      ...visits.map((visit): PetHistoryEvent => ({ type: "VISIT", date: visit.date, visit })),
      ...controls.map((control): PetHistoryEvent => ({
        type: "PREVENTIVE_CONTROL",
        date: control.appliedOn,
        control,
      })),
      ...appointments.map((appointment): PetHistoryEvent => ({
        type: "APPOINTMENT",
        date: appointment.dateTime,
        appointment,
      })),
      ...changes.map((change): PetHistoryEvent => ({ type: "CHANGE", date: change.date, change })),
    ];

    return events.sort((a, b) => b.date.localeCompare(a.date));
  },
};
