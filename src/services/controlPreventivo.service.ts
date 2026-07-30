import { ControlRegistro } from "../data/controles-preventivos.data";
import { controlPreventivoRepository } from "../repositories/controlPreventivo.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { ControlPreventivo, TipoControlPreventivo } from "../types";
import { addDays, todayISO } from "../utils/date";

export class DatosDeControlInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeControlInvalidosError";
  }
}

interface NuevoControlInput {
  mascotaId: number;
  tipo: TipoControlPreventivo;
  fechaAplicacion: string;
  proximaDosis?: string;
}

function hidratar(registro: ControlRegistro): ControlPreventivo {
  const mascota = mascotaRepository.findById(registro.mascotaId)!;
  return {
    id: registro.id,
    mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
    tipo: registro.tipo,
    fechaAplicacion: registro.fechaAplicacion,
    proximaDosis: registro.proximaDosis,
    vencido: !!registro.proximaDosis && registro.proximaDosis < todayISO(),
  };
}

export const controlPreventivoService = {
  historialDeMascota(mascotaId: number): ControlPreventivo[] {
    if (!mascotaRepository.findById(mascotaId)) {
      throw new DatosDeControlInvalidosError("La mascota no existe");
    }
    return controlPreventivoRepository.findByMascotaId(mascotaId).map(hidratar);
  },

  proximosAVencer(dias: number): ControlPreventivo[] {
    const limite = addDays(todayISO(), dias);
    return controlPreventivoRepository
      .findAll()
      .map(hidratar)
      .filter((c) => c.proximaDosis && c.proximaDosis <= limite)
      .sort((a, b) => a.proximaDosis.localeCompare(b.proximaDosis));
  },

  crear(input: NuevoControlInput): ControlPreventivo {
    if (!input.mascotaId || !input.tipo || !input.fechaAplicacion) {
      throw new DatosDeControlInvalidosError("Mascota, tipo y fecha de aplicación son obligatorios");
    }
    if (!mascotaRepository.findById(input.mascotaId)) {
      throw new DatosDeControlInvalidosError("La mascota no existe");
    }

    const registro: ControlRegistro = {
      id: controlPreventivoRepository.nextId(),
      mascotaId: input.mascotaId,
      tipo: input.tipo,
      fechaAplicacion: input.fechaAplicacion,
      proximaDosis: input.proximaDosis ?? "",
    };
    controlPreventivoRepository.create(registro);
    return hidratar(registro);
  },
};
