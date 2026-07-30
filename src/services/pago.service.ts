import { atencionRepository } from "../repositories/atencion.repository";
import { pagoRepository } from "../repositories/pago.repository";
import { MetodoPago } from "../types";

export class PagoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "PagoInvalidoError";
  }
}

export const pagoService = {
  listarPendientes() {
    return pagoRepository.findPendientes();
  },

  registrar(atencionId: number, metodoPago: MetodoPago, monto: number) {
    if (!monto || monto <= 0) {
      throw new PagoInvalidoError("El monto debe ser mayor a 0");
    }
    const atencion = atencionRepository.findById(atencionId);
    if (!atencion || atencion.estadoPago === "PAGADO") {
      throw new PagoInvalidoError("La atención ya fue pagada o no existe");
    }

    atencionRepository.marcarPagada(atencionId);
    return pagoRepository.registrar({
      id: pagoRepository.nextId(),
      atencionId,
      metodoPago,
      monto,
      fecha: new Date().toISOString(),
    });
  },
};
