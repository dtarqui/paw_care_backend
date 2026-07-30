import { ControlRegistro, controlPreventivoRepository } from "../repositories/controlPreventivo.repository";
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

async function hidratar(registro: ControlRegistro): Promise<ControlPreventivo> {
  const mascota = await mascotaRepository.findById(registro.mascotaId);
  if (!mascota) {
    throw new Error(`Integridad de datos: el control ${registro.id} referencia una mascota inexistente`);
  }
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
  async historialDeMascota(mascotaId: number): Promise<ControlPreventivo[]> {
    if (!(await mascotaRepository.findById(mascotaId))) {
      throw new DatosDeControlInvalidosError("La mascota no existe");
    }
    const registros = await controlPreventivoRepository.findByMascotaId(mascotaId);
    return Promise.all(registros.map(hidratar));
  },

  async proximosAVencer(dias: number): Promise<ControlPreventivo[]> {
    const limite = addDays(todayISO(), dias);
    const registros = await controlPreventivoRepository.findAll();
    const hidratados = await Promise.all(registros.map(hidratar));
    return hidratados
      .filter((c) => c.proximaDosis && c.proximaDosis <= limite)
      .sort((a, b) => a.proximaDosis.localeCompare(b.proximaDosis));
  },

  async crear(input: NuevoControlInput): Promise<ControlPreventivo> {
    if (!input.mascotaId || !input.tipo || !input.fechaAplicacion) {
      throw new DatosDeControlInvalidosError("Mascota, tipo y fecha de aplicación son obligatorios");
    }
    if (!(await mascotaRepository.findById(input.mascotaId))) {
      throw new DatosDeControlInvalidosError("La mascota no existe");
    }

    const registro = await controlPreventivoRepository.create({
      mascotaId: input.mascotaId,
      tipo: input.tipo,
      fechaAplicacion: input.fechaAplicacion,
      proximaDosis: input.proximaDosis,
    });
    return hidratar(registro);
  },
};
