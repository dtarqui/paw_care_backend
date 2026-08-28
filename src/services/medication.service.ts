import { medicationRepository } from "../repositories/medication.repository";
import { ExpiringBatch, Medication, MedicationBatch } from "../types";
import { todayISO } from "../utils/date";

export class InvalidMedicationDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMedicationDataError";
  }
}

export class InsufficientStockError extends Error {
  /** Si el faltante se explica por lotes vencidos hay que decirlo: en el estante
   * parece haber suficiente, y sin esa aclaración el mensaje parece un error. */
  constructor(medicationName: string, expiredStock = 0) {
    const vencidas =
      expiredStock > 0 ? ` (hay ${expiredStock} unidades vencidas, que no se pueden usar)` : "";
    super(`Stock insuficiente de "${medicationName}" para completar la atención${vencidas}`);
    this.name = "InsufficientStockError";
  }
}

export class ExpiredBatchError extends Error {
  constructor() {
    super("La fecha de vencimiento ya pasó: no se puede registrar una entrada de un lote vencido");
    this.name = "ExpiredBatchError";
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

/** No se registra una entrada de algo que ya venció: si la caja llegó vencida, el
 * lugar donde eso se resuelve es el proveedor, no el inventario. */
function validateExpiry(expiresOn?: string) {
  if (expiresOn && expiresOn < todayISO()) {
    throw new ExpiredBatchError();
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

  async create(input: {
    name: string;
    minimumStock: number;
    initialStock?: number;
    batchNumber?: string;
    expiresOn?: string;
  }): Promise<Medication> {
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
    if (initialStock > 0) validateExpiry(input.expiresOn);

    const medication = await medicationRepository.create({
      name: input.name.trim(),
      minimumStock: input.minimumStock,
    });
    if (initialStock > 0) {
      await medicationRepository.registerBatch({
        medicationId: medication.id,
        quantity: initialStock,
        batchNumber: input.batchNumber?.trim() || undefined,
        expiresOn: input.expiresOn || undefined,
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

  /** Cada entrada de stock es un lote nuevo, aunque venga sin número ni vencimiento:
   * dos compras del mismo medicamento vencen en fechas distintas y mezclarlas en un
   * solo montón es justamente lo que impide avisar a tiempo. */
  async registerStockIn(
    medicationId: number,
    quantity: number,
    batch: { batchNumber?: string; expiresOn?: string } = {}
  ): Promise<Medication> {
    if (!quantity || quantity <= 0) {
      throw new InvalidMedicationDataError("La cantidad debe ser mayor a 0");
    }
    if (!(await medicationRepository.findById(medicationId))) {
      throw new InvalidMedicationDataError("El medicamento no existe");
    }
    validateExpiry(batch.expiresOn);

    await medicationRepository.registerBatch({
      medicationId,
      quantity,
      batchNumber: batch.batchNumber?.trim() || undefined,
      expiresOn: batch.expiresOn || undefined,
    });
    return (await medicationRepository.findById(medicationId))!;
  },

  batches(medicationId: number): Promise<MedicationBatch[]> {
    return medicationRepository.findBatches(medicationId);
  },

  /** Lo vencido y lo que vence pronto, para la alerta del inventario. */
  expiring(withinDays: number): Promise<ExpiringBatch[]> {
    return medicationRepository.findExpiring(withinDays);
  },

  /** Usado por medicalVisit.service al guardar una atención que consumió medicamentos. */
  async checkAvailability(items: ConsumedMedicationItem[]): Promise<void> {
    for (const item of items) {
      const medication = await medicationRepository.findById(item.medicationId);
      if (!medication) {
        throw new InvalidMedicationDataError("Uno de los medicamentos seleccionados ya no existe");
      }
      if (medication.availableStock < item.quantity) {
        throw new InsufficientStockError(medication.name, medication.expiredStock);
      }
    }
  },

  async consumeForVisit(visitId: number, items: ConsumedMedicationItem[]): Promise<void> {
    for (const item of items) {
      // Sale primero lo que vence antes, y nunca un lote vencido.
      const pending = await medicationRepository.consumeFromBatches(
        item.medicationId,
        item.quantity,
        visitId
      );
      if (pending > 0) {
        // `checkAvailability` corre antes, así que llegar acá significa que el stock
        // cambió en el medio. Vale más cortar que dejar el inventario en negativo.
        const medication = await medicationRepository.findById(item.medicationId);
        throw new InsufficientStockError(medication?.name ?? "medicamento", medication?.expiredStock ?? 0);
      }
    }
  },
};
