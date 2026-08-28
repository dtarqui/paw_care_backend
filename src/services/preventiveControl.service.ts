import { petRepository } from "../repositories/pet.repository";
import {
  PreventiveControlRecord,
  preventiveControlRepository,
} from "../repositories/preventiveControl.repository";
import { PreventiveControl, PreventiveControlType } from "../types";
import { addDays, todayISO } from "../utils/date";

export class VaccinationCardNotFoundError extends Error {
  constructor() {
    super("La mascota solicitada no existe");
    this.name = "VaccinationCardNotFoundError";
  }
}

export class InvalidPreventiveControlDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPreventiveControlDataError";
  }
}

interface NewPreventiveControlInput {
  petId: number;
  type: PreventiveControlType;
  appliedOn: string;
  nextDoseOn?: string;
}

async function hydrate(record: PreventiveControlRecord): Promise<PreventiveControl> {
  const pet = await petRepository.findById(record.petId);
  if (!pet) {
    throw new Error(`Integridad de datos: el control ${record.id} referencia una mascota inexistente`);
  }
  return {
    id: record.id,
    pet: { id: pet.id, name: pet.name, species: pet.species },
    type: record.type,
    appliedOn: record.appliedOn,
    nextDoseOn: record.nextDoseOn,
    overdue: !!record.nextDoseOn && record.nextDoseOn < todayISO(),
  };
}

export const preventiveControlService = {
  /** El carnet de una mascota, listo para imprimir. */
  async vaccinationCard(petId: number) {
    const card = await preventiveControlRepository.findVaccinationCard(petId);
    if (!card) throw new VaccinationCardNotFoundError();
    return card;
  },

  async petHistory(petId: number): Promise<PreventiveControl[]> {
    if (!(await petRepository.findById(petId))) {
      throw new InvalidPreventiveControlDataError("La mascota no existe");
    }
    const records = await preventiveControlRepository.findByPetId(petId);
    return Promise.all(records.map(hydrate));
  },

  async upcoming(days: number): Promise<PreventiveControl[]> {
    const limit = addDays(todayISO(), days);
    const records = await preventiveControlRepository.findAll();
    const hydrated = await Promise.all(records.map(hydrate));
    return hydrated
      .filter((c) => c.nextDoseOn && c.nextDoseOn <= limit)
      .sort((a, b) => a.nextDoseOn.localeCompare(b.nextDoseOn));
  },

  async create(input: NewPreventiveControlInput): Promise<PreventiveControl> {
    if (!input.petId || !input.type || !input.appliedOn) {
      throw new InvalidPreventiveControlDataError(
        "Mascota, tipo y fecha de aplicación son obligatorios"
      );
    }
    if (!(await petRepository.findById(input.petId))) {
      throw new InvalidPreventiveControlDataError("La mascota no existe");
    }

    const record = await preventiveControlRepository.create({
      petId: input.petId,
      type: input.type,
      appliedOn: input.appliedOn,
      nextDoseOn: input.nextDoseOn,
    });
    return hydrate(record);
  },
};
