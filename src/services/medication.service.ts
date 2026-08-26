import { medicationRepository } from "../repositories/medication.repository";
import { Medication } from "../types";

export class InvalidMedicationDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMedicationDataError";
  }
}

export class InsufficientStockError extends Error {
  constructor(medicationName: string) {
    super(`Stock insuficiente de "${medicationName}" para completar la atención`);
    this.name = "InsufficientStockError";
  }
}

export class DuplicateMedicationError extends Error {
  constructor() {
    super("Ya existe un medicamento registrado con ese nombre");
    this.name = "DuplicateMedicationError";
  }
}

export class MedicationNotFoundError extends Error {
  constructor() {
    super("El medicamento solicitado no existe");
    this.name = "MedicationNotFoundError";
  }
}

export class MedicationHasMovesError extends Error {
  constructor() {
    super("No se puede eliminar: este medicamento ya tiene movimientos de inventario registrados");
    this.name = "MedicationHasMovesError";
  }
}

export interface ConsumedMedicationItem {
  medicationId: number;
  quantity: number;
}

export const medicationService = {
  list(): Promise<Medication[]> {
    return medicationRepository.findAll();
  },

  async create(input: { name: string; minimumStock: number; initialStock?: number }): Promise<Medication> {
    if (!input.name?.trim()) {
      throw new InvalidMedicationDataError("El nombre es obligatorio");
    }
    if (input.minimumStock === undefined || input.minimumStock < 0) {
      throw new InvalidMedicationDataError("El stock mínimo debe ser 0 o mayor");
    }
    if (await medicationRepository.findByName(input.name.trim())) {
      throw new DuplicateMedicationError();
    }

    const initialStock = input.initialStock ?? 0;
    const medication = await medicationRepository.create({
      name: input.name.trim(),
      minimumStock: input.minimumStock,
    });
    if (initialStock > 0) {
      await medicationRepository.adjustStock(medication.id, initialStock);
      await medicationRepository.registerMove({
        medicationId: medication.id,
        type: "IN",
        quantity: initialStock,
      });
    }
    return (await medicationRepository.findById(medication.id))!;
  },

  async update(id: number, input: { name?: string; minimumStock?: number }): Promise<Medication> {
    if (!(await medicationRepository.findById(id))) {
      throw new MedicationNotFoundError();
    }
    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new InvalidMedicationDataError("El nombre es obligatorio");
      }
      const existing = await medicationRepository.findByName(input.name.trim());
      if (existing && existing.id !== id) {
        throw new DuplicateMedicationError();
      }
    }
    if (input.minimumStock !== undefined && input.minimumStock < 0) {
      throw new InvalidMedicationDataError("El stock mínimo debe ser 0 o mayor");
    }
    return medicationRepository.update(id, {
      name: input.name?.trim(),
      minimumStock: input.minimumStock,
    });
  },

  async remove(id: number): Promise<void> {
    if (!(await medicationRepository.findById(id))) {
      throw new MedicationNotFoundError();
    }
    if (await medicationRepository.hasMoves(id)) {
      throw new MedicationHasMovesError();
    }
    await medicationRepository.remove(id);
  },

  lowStock(): Promise<Medication[]> {
    return medicationRepository.findLowStock();
  },

  async registerStockIn(medicationId: number, quantity: number): Promise<Medication> {
    if (!quantity || quantity <= 0) {
      throw new InvalidMedicationDataError("La cantidad debe ser mayor a 0");
    }
    const medication = await medicationRepository.findById(medicationId);
    if (!medication) {
      throw new InvalidMedicationDataError("El medicamento no existe");
    }

    await medicationRepository.adjustStock(medicationId, quantity);
    await medicationRepository.registerMove({ medicationId, type: "IN", quantity });
    return (await medicationRepository.findById(medicationId))!;
  },

  /** Usado por medicalVisit.service al guardar una atención que consumió medicamentos. */
  async checkAvailability(items: ConsumedMedicationItem[]): Promise<void> {
    for (const item of items) {
      const medication = await medicationRepository.findById(item.medicationId);
      if (!medication) {
        throw new InvalidMedicationDataError("Uno de los medicamentos seleccionados ya no existe");
      }
      if (medication.currentStock < item.quantity) {
        throw new InsufficientStockError(medication.name);
      }
    }
  },

  async consumeForVisit(visitId: number, items: ConsumedMedicationItem[]): Promise<void> {
    for (const item of items) {
      await medicationRepository.adjustStock(item.medicationId, -item.quantity);
      await medicationRepository.registerMove({
        medicationId: item.medicationId,
        type: "OUT",
        quantity: item.quantity,
        visitId,
      });
    }
  },
};
