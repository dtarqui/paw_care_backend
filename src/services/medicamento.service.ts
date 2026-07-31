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

export class MedicamentoDuplicadoError extends Error {
  constructor() {
    super("Ya existe un medicamento registrado con ese nombre");
    this.name = "MedicamentoDuplicadoError";
  }
}

export class MedicamentoNoEncontradoError extends Error {
  constructor() {
    super("El medicamento solicitado no existe");
    this.name = "MedicamentoNoEncontradoError";
  }
}

export class MedicamentoConMovimientosError extends Error {
  constructor() {
    super("No se puede eliminar: este medicamento ya tiene movimientos de inventario registrados");
    this.name = "MedicamentoConMovimientosError";
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

  async crear(input: { nombre: string; stockMinimo: number; stockInicial?: number }): Promise<Medicamento> {
    if (!input.nombre?.trim()) {
      throw new DatosDeMedicamentoInvalidosError("El nombre es obligatorio");
    }
    if (input.stockMinimo === undefined || input.stockMinimo < 0) {
      throw new DatosDeMedicamentoInvalidosError("El stock mínimo debe ser 0 o mayor");
    }
    if (await medicamentoRepository.findByNombre(input.nombre.trim())) {
      throw new MedicamentoDuplicadoError();
    }

    const stockInicial = input.stockInicial ?? 0;
    const medicamento = await medicamentoRepository.create({
      nombre: input.nombre.trim(),
      stockMinimo: input.stockMinimo,
    });
    if (stockInicial > 0) {
      await medicamentoRepository.ajustarStock(medicamento.id, stockInicial);
      await medicamentoRepository.registrarMovimiento({ medicamentoId: medicamento.id, tipo: "ENTRADA", cantidad: stockInicial });
    }
    return (await medicamentoRepository.findById(medicamento.id))!;
  },

  async actualizar(id: number, input: { nombre?: string; stockMinimo?: number }): Promise<Medicamento> {
    if (!(await medicamentoRepository.findById(id))) {
      throw new MedicamentoNoEncontradoError();
    }
    if (input.nombre !== undefined) {
      if (!input.nombre.trim()) {
        throw new DatosDeMedicamentoInvalidosError("El nombre es obligatorio");
      }
      const existente = await medicamentoRepository.findByNombre(input.nombre.trim());
      if (existente && existente.id !== id) {
        throw new MedicamentoDuplicadoError();
      }
    }
    if (input.stockMinimo !== undefined && input.stockMinimo < 0) {
      throw new DatosDeMedicamentoInvalidosError("El stock mínimo debe ser 0 o mayor");
    }
    return medicamentoRepository.actualizar(id, {
      nombre: input.nombre?.trim(),
      stockMinimo: input.stockMinimo,
    });
  },

  async eliminar(id: number): Promise<void> {
    if (!(await medicamentoRepository.findById(id))) {
      throw new MedicamentoNoEncontradoError();
    }
    if (await medicamentoRepository.tieneMovimientos(id)) {
      throw new MedicamentoConMovimientosError();
    }
    await medicamentoRepository.eliminar(id);
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
