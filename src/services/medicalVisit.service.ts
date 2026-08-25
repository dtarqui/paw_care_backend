import { VisitRecord, medicalVisitRepository } from "../repositories/medicalVisit.repository";
import { petRepository } from "../repositories/pet.repository";
import { vetRepository } from "../repositories/vet.repository";
import { MedicalVisit } from "../types";
import { medicationService } from "./medication.service";

export class InvalidVisitDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVisitDataError";
  }
}

interface NewVisitInput {
  petId: number;
  vetId: number;
  serviceType: string;
  diagnosis: string;
  treatment: string;
  externalExams?: string;
  weight?: number;
  consultationFee: number;
  medications?: { medicationId: number; quantity: number }[];
}

async function hydrate(record: VisitRecord): Promise<MedicalVisit> {
  const pet = await petRepository.findById(record.petId);
  const vet = await vetRepository.findById(record.vetId);
  if (!pet || !vet) {
    throw new Error(
      `Integridad de datos: la atención ${record.id} referencia mascota o veterinario inexistente`
    );
  }
  return {
    id: record.id,
    pet: { id: pet.id, name: pet.name, species: pet.species },
    vet: { id: vet.id, firstName: vet.firstName, paternalLastName: vet.paternalLastName },
    date: record.date,
    serviceType: record.serviceType,
    diagnosis: record.diagnosis,
    treatment: record.treatment,
    externalExams: record.externalExams,
    weight: record.weight,
    consultationFee: record.consultationFee,
    paymentStatus: record.paymentStatus,
  };
}

export const medicalVisitService = {
  async petHistory(petId: number): Promise<MedicalVisit[]> {
    if (!(await petRepository.findById(petId))) {
      throw new InvalidVisitDataError("La mascota no existe");
    }
    const records = await medicalVisitRepository.findByPetId(petId);
    return Promise.all(records.map(hydrate));
  },

  async create(input: NewVisitInput): Promise<MedicalVisit> {
    // Dado que faltan campos obligatorios (diagnóstico/tratamiento), se previene el guardado (HU3).
    if (
      !input.petId ||
      !input.vetId ||
      !input.serviceType?.trim() ||
      !input.diagnosis?.trim() ||
      !input.treatment?.trim()
    ) {
      throw new InvalidVisitDataError("Tipo de servicio, diagnóstico y tratamiento son obligatorios");
    }
    if (!(await petRepository.findById(input.petId)) || !(await vetRepository.findById(input.vetId))) {
      throw new InvalidVisitDataError("Mascota o veterinario inválido");
    }

    const consumedMedications = (input.medications ?? []).filter((m) => m.medicationId && m.quantity > 0);
    // Se valida el stock ANTES de crear la atención, para no dejar un registro huérfano si falta stock (HU9).
    if (consumedMedications.length > 0) {
      await medicationService.checkAvailability(consumedMedications);
    }

    const weight = input.weight && input.weight > 0 ? Number(input.weight) : undefined;

    const record = await medicalVisitRepository.create({
      petId: input.petId,
      vetId: input.vetId,
      serviceType: input.serviceType.trim(),
      diagnosis: input.diagnosis.trim(),
      treatment: input.treatment.trim(),
      externalExams: input.externalExams?.trim() ?? "",
      weight,
      consultationFee: Number(input.consultationFee) || 0,
    });

    if (consumedMedications.length > 0) {
      await medicationService.consumeForVisit(record.id, consumedMedications);
    }

    // El peso tomado en la visita queda como el "peso actual" de la ficha de la
    // mascota — sin generar una fila en PetChange (ya es visible en esta
    // atención dentro del historial; ver pet.service.ts).
    if (weight !== undefined) {
      await petRepository.update(input.petId, { weight });
    }

    return hydrate(record);
  },
};
