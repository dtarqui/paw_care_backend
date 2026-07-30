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
  listar(): Promise<Medicamento[]> {
    return medicamentoRepository.findAll();
  },

  bajoStock(): Promise<Medicamento[]> {
    return medicamentoRepository.findBajoStock();
  },

  async registrarEntrada(medicamentoId: number, cantidad: number): Promise<Medicamento> {
    if (!cantidad || cantidad <= 0) {
      throw new DatosDeMedicamentoInvalidosError("La cantidad debe ser mayor a 0");
    }
    const medicamento = await medicamentoRepository.findById(medicamentoId);
    if (!medicamento) {
      throw new DatosDeMedicamentoInvalidosError("El medicamento no existe");
    }

    await medicamentoRepository.ajustarStock(medicamentoId, cantidad);
    await medicamentoRepository.registrarMovimiento({ medicamentoId, tipo: "ENTRADA", cantidad });
    return (await medicamentoRepository.findById(medicamentoId))!;
  },

  /** Usado por atencion.service al guardar una atención que consumió medicamentos. */
  async validarDisponibilidad(items: ItemMedicamentoConsumido[]): Promise<void> {
    for (const item of items) {
      const medicamento = await medicamentoRepository.findById(item.medicamentoId);
      if (!medicamento) {
        throw new DatosDeMedicamentoInvalidosError(`El medicamento ${item.medicamentoId} no existe`);
      }
      if (medicamento.stockActual < item.cantidad) {
        throw new StockInsuficienteError(medicamento.nombre);
      }
    }
  },

  async consumirParaAtencion(atencionId: number, items: ItemMedicamentoConsumido[]): Promise<void> {
    for (const item of items) {
      await medicamentoRepository.ajustarStock(item.medicamentoId, -item.cantidad);
      await medicamentoRepository.registrarMovimiento({
        medicamentoId: item.medicamentoId,
        tipo: "SALIDA",
        cantidad: item.cantidad,
        atencionId,
      });
    }
  },
};
