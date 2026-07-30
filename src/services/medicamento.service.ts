import { medicamentoRepository } from "../repositories/medicamento.repository";
import { Medicamento } from "../types";

export class DatosDeMedicamentoInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeMedicamentoInvalidosError";
  }
}

export class StockInsuficienteError extends Error {
  constructor(nombreMedicamento: string) {
    super(`Stock insuficiente de "${nombreMedicamento}" para completar la atención`);
    this.name = "StockInsuficienteError";
  }
}

export interface ItemMedicamentoConsumido {
  medicamentoId: number;
  cantidad: number;
}

export const medicamentoService = {
  listar(): Medicamento[] {
    return medicamentoRepository.findAll();
  },

  bajoStock(): Medicamento[] {
    return medicamentoRepository.findBajoStock();
  },

  registrarEntrada(medicamentoId: number, cantidad: number): Medicamento {
    if (!cantidad || cantidad <= 0) {
      throw new DatosDeMedicamentoInvalidosError("La cantidad debe ser mayor a 0");
    }
    const medicamento = medicamentoRepository.findById(medicamentoId);
    if (!medicamento) {
      throw new DatosDeMedicamentoInvalidosError("El medicamento no existe");
    }

    medicamentoRepository.ajustarStock(medicamentoId, cantidad);
    medicamentoRepository.registrarMovimiento({
      id: medicamentoRepository.nextMovimientoId(),
      medicamentoId,
      tipo: "ENTRADA",
      cantidad,
      fecha: new Date().toISOString(),
    });
    return medicamentoRepository.findById(medicamentoId)!;
  },

  /** Usado por atencion.service al guardar una atención que consumió medicamentos. */
  validarDisponibilidad(items: ItemMedicamentoConsumido[]): void {
    for (const item of items) {
      const medicamento = medicamentoRepository.findById(item.medicamentoId);
      if (!medicamento) {
        throw new DatosDeMedicamentoInvalidosError(`El medicamento ${item.medicamentoId} no existe`);
      }
      if (medicamento.stockActual < item.cantidad) {
        throw new StockInsuficienteError(medicamento.nombre);
      }
    }
  },

  consumirParaAtencion(atencionId: number, items: ItemMedicamentoConsumido[]): void {
    for (const item of items) {
      medicamentoRepository.ajustarStock(item.medicamentoId, -item.cantidad);
      medicamentoRepository.registrarMovimiento({
        id: medicamentoRepository.nextMovimientoId(),
        medicamentoId: item.medicamentoId,
        tipo: "SALIDA",
        cantidad: item.cantidad,
        fecha: new Date().toISOString(),
        atencionId,
      });
    }
  },
};
