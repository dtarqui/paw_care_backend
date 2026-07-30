import { MedicamentoRegistro, medicamentos } from "../data/medicamentos.data";
import { MovimientoRegistro, movimientosInventario } from "../data/movimientos-inventario.data";

export const medicamentoRepository = {
  findAll(): MedicamentoRegistro[] {
    return medicamentos;
  },

  findById(id: number): MedicamentoRegistro | undefined {
    return medicamentos.find((m) => m.id === id);
  },

  findBajoStock(): MedicamentoRegistro[] {
    return medicamentos.filter((m) => m.stockActual <= m.stockMinimo);
  },

  ajustarStock(id: number, delta: number): void {
    const medicamento = medicamentos.find((m) => m.id === id);
    if (medicamento) medicamento.stockActual += delta;
  },

  registrarMovimiento(movimiento: MovimientoRegistro): void {
    movimientosInventario.push(movimiento);
  },

  nextMovimientoId(): number {
    return Math.max(0, ...movimientosInventario.map((m) => m.id)) + 1;
  },
};
