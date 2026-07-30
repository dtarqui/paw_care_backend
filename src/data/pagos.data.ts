import { MetodoPago } from "../types";
import { atenciones } from "./atenciones.data";

// Ledger de pagos ya confirmados (1 a 1 con una AtencionMedica pagada).
// Los "pendientes de pago" no viven acá: se derivan en vivo de las atenciones
// con estadoPago = PENDIENTE (ver pago.repository.ts).
export interface PagoRegistro {
  id: number;
  atencionId: number;
  metodoPago: MetodoPago;
  monto: number;
  fecha: string;
}

// Un registro de pago por cada atención sembrada como PAGADO en atenciones.data.ts —
// así el ledger queda consistente desde el arranque y los reportes (HU7/HU8) tienen
// datos reales para mostrar sin que el usuario tenga que cobrar nada primero.
const METODOS: MetodoPago[] = ["EFECTIVO", "QR", "TARJETA", "TRANSFERENCIA"];

export const pagos: PagoRegistro[] = atenciones
  .filter((a) => a.estadoPago === "PAGADO")
  .map((a, index) => ({
    id: index + 1,
    atencionId: a.id,
    metodoPago: METODOS[index % METODOS.length],
    monto: a.montoConsulta,
    fecha: a.fecha,
  }));
