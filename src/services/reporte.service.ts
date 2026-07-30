import { atencionRepository } from "../repositories/atencion.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { pagoRepository } from "../repositories/pago.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { MetodoPago } from "../types";

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  tipoServicio?: string;
  metodoPago?: MetodoPago;
}

export interface PagoDetalle {
  id: number;
  atencionId: number;
  metodoPago: MetodoPago;
  monto: number;
  fecha: string;
  tipoServicio: string;
  mascota: string;
  propietario: string;
}

export interface AtencionResumen {
  id: number;
  fecha: string;
  mascota: string;
  propietario: string;
  veterinario: string;
  tipoServicio: string;
  montoConsulta: number;
  estadoPago: string;
}

export interface GrupoPorServicio {
  tipoServicio: string;
  cantidad: number;
  monto: number;
}

function dentroDeRango(fechaISO: string, desde?: string, hasta?: string): boolean {
  const fecha = fechaISO.slice(0, 10);
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

async function pagosDetallados(): Promise<PagoDetalle[]> {
  const pagos = await pagoRepository.findAllRaw();
  return Promise.all(
    pagos.map(async (pago) => {
      const atencion = (await atencionRepository.findById(pago.atencionId))!;
      const mascota = (await mascotaRepository.findById(atencion.mascotaId))!;
      return {
        id: pago.id,
        atencionId: pago.atencionId,
        metodoPago: pago.metodoPago,
        monto: pago.monto,
        fecha: pago.fecha,
        tipoServicio: atencion.tipoServicio,
        mascota: mascota.nombre,
        propietario: `${mascota.propietario.nombre} ${mascota.propietario.apellidoPaterno}`,
      };
    })
  );
}

export const reporteService = {
  /** HU7 — reporte de ingresos con filtros y totales. */
  async ingresos(filtros: FiltrosReporte) {
    let pagos = (await pagosDetallados()).filter((p) => dentroDeRango(p.fecha, filtros.desde, filtros.hasta));
    if (filtros.tipoServicio) pagos = pagos.filter((p) => p.tipoServicio === filtros.tipoServicio);
    if (filtros.metodoPago) pagos = pagos.filter((p) => p.metodoPago === filtros.metodoPago);

    return {
      pagos,
      totales: { cantidad: pagos.length, monto: pagos.reduce((suma, p) => suma + p.monto, 0) },
    };
  },

  /** HU8 — listado de atenciones por período. */
  async atencionesPorPeriodo(filtros: FiltrosReporte): Promise<AtencionResumen[]> {
    const atenciones = (await atencionRepository.findAll()).filter((a) => dentroDeRango(a.fecha, filtros.desde, filtros.hasta));
    return Promise.all(
      atenciones.map(async (a) => {
        const mascota = (await mascotaRepository.findById(a.mascotaId))!;
        const veterinario = await veterinarioRepository.findById(a.veterinarioId);
        return {
          id: a.id,
          fecha: a.fecha,
          mascota: mascota.nombre,
          propietario: `${mascota.propietario.nombre} ${mascota.propietario.apellidoPaterno}`,
          veterinario: veterinario ? `${veterinario.nombre} ${veterinario.apellidoPaterno}` : "",
          tipoServicio: a.tipoServicio,
          montoConsulta: a.montoConsulta,
          estadoPago: a.estadoPago,
        };
      })
    );
  },

  /** HU8 — ingresos agrupados por tipo de servicio, para el gráfico. */
  async ingresosPorServicio(filtros: FiltrosReporte): Promise<GrupoPorServicio[]> {
    const pagos = (await pagosDetallados()).filter((p) => dentroDeRango(p.fecha, filtros.desde, filtros.hasta));
    const grupos = new Map<string, GrupoPorServicio>();
    for (const pago of pagos) {
      const grupo = grupos.get(pago.tipoServicio) ?? { tipoServicio: pago.tipoServicio, cantidad: 0, monto: 0 };
      grupo.cantidad += 1;
      grupo.monto += pago.monto;
      grupos.set(pago.tipoServicio, grupo);
    }
    return [...grupos.values()].sort((a, b) => b.monto - a.monto);
  },
};
