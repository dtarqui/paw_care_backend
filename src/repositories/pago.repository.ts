import { PagoRegistro, pagos } from "../data/pagos.data";
import { PagoPendiente } from "../types";
import { atencionRepository } from "./atencion.repository";
import { mascotaRepository } from "./mascota.repository";

export const pagoRepository = {
  findPendientes(): PagoPendiente[] {
    return atencionRepository.findPendientes().map((atencion) => {
      const mascota = mascotaRepository.findById(atencion.mascotaId)!;
      return {
        atencionId: atencion.id,
        mascota: { id: mascota.id, nombre: mascota.nombre },
        propietario: {
          id: mascota.propietario.id,
          nombre: mascota.propietario.nombre,
          apellidoPaterno: mascota.propietario.apellidoPaterno,
        },
        motivoConsulta: atencion.diagnostico,
        monto: atencion.montoConsulta,
        fecha: atencion.fecha,
      };
    });
  },

  findAllRaw(): PagoRegistro[] {
    return [...pagos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  registrar(registro: PagoRegistro): PagoRegistro {
    pagos.push(registro);
    return registro;
  },

  nextId(): number {
    return Math.max(0, ...pagos.map((p) => p.id)) + 1;
  },
};
