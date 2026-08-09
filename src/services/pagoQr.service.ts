import { generarCobroQrBancario } from "../lib/pagoQr";
import { atencionRepository } from "../repositories/atencion.repository";
import { cobroQrRepository } from "../repositories/cobroQr.repository";
import { pagoRepository } from "../repositories/pago.repository";
import { CobroQr } from "../types";

export class CobroQrNoEncontradoError extends Error {
  constructor() {
    super("El cobro QR indicado no existe");
    this.name = "CobroQrNoEncontradoError";
  }
}

export class AtencionYaPagadaError extends Error {
  constructor() {
    super("Esta atención ya fue pagada o no existe");
    this.name = "AtencionYaPagadaError";
  }
}

// Nombre informativo del banco elegido, para mostrarlo en la UI ("Cobro QR vía BCP")
// — no cambia el comportamiento, solo cómo se etiqueta el CobroQr.proveedor.
const PROVEEDOR = process.env.PAGO_QR_BANCO ?? "QR Simple";

export const pagoQrService = {
  async generar(atencionId: number): Promise<CobroQr> {
    const atencion = await atencionRepository.findById(atencionId);
    if (!atencion || atencion.estadoPago === "PAGADO") {
      throw new AtencionYaPagadaError();
    }

    // generarCobroQrBancario lanza ProveedorPagoQrNoConfiguradoError hasta que se
    // conecte la API real del banco elegido — ver lib/pagoQr.ts.
    const resultado = await generarCobroQrBancario({
      monto: atencion.montoConsulta,
      referencia: `Atencion #${atencionId} - PawCare`,
    });

    return cobroQrRepository.crear({
      atencionId,
      monto: atencion.montoConsulta,
      proveedor: PROVEEDOR,
      referenciaExterna: resultado.referenciaExterna,
      qrPayload: resultado.qrPayload,
      expiraEn: resultado.expiraEn,
    });
  },

  async consultar(id: number): Promise<CobroQr> {
    const cobro = await cobroQrRepository.findById(id);
    if (!cobro) throw new CobroQrNoEncontradoError();
    return cobro;
  },

  /**
   * Llamado por el webhook del banco cuando confirma un cobro. Idempotente a
   * propósito (no-op si ya no está PENDIENTE o no existe) porque los webhooks
   * bancarios suelen reintentar la misma notificación. Crea el Pago real — mismo
   * efecto que registrar un pago manual con metodoPago QR (pago.service.ts#registrar),
   * no lo reemplaza — y marca la atención como pagada.
   */
  async confirmarPorReferenciaExterna(referenciaExterna: string): Promise<void> {
    const cobro = await cobroQrRepository.findByReferenciaExterna(referenciaExterna);
    if (!cobro || cobro.estado !== "PENDIENTE") return;

    await cobroQrRepository.actualizarEstado(cobro.id, "CONFIRMADO");
    await atencionRepository.marcarPagada(cobro.atencionId);
    await pagoRepository.registrar({ atencionId: cobro.atencionId, metodoPago: "QR", monto: cobro.monto });
  },
};
