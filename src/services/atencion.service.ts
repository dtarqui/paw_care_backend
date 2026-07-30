import { AtencionRegistro, atencionRepository } from "../repositories/atencion.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { medicamentoService } from "./medicamento.service";
import { AtencionMedica } from "../types";

export class DatosDeAtencionInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeAtencionInvalidosError";
  }
}

interface NuevaAtencionInput {
  mascotaId: number;
  veterinarioId: number;
  tipoServicio: string;
  diagnostico: string;
  tratamiento: string;
  examenesExternos?: string;
  montoConsulta: number;
  medicamentos?: { medicamentoId: number; cantidad: number }[];
}

async function hidratar(registro: AtencionRegistro): Promise<AtencionMedica> {
  const mascota = await mascotaRepository.findById(registro.mascotaId);
  const veterinario = await veterinarioRepository.findById(registro.veterinarioId);
  if (!mascota || !veterinario) {
    throw new Error(`Integridad de datos: la atención ${registro.id} referencia mascota o veterinario inexistente`);
  }
  return {
    id: registro.id,
    mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
    veterinario: { id: veterinario.id, nombre: veterinario.nombre, apellidoPaterno: veterinario.apellidoPaterno },
    fecha: registro.fecha,
    tipoServicio: registro.tipoServicio,
    diagnostico: registro.diagnostico,
    tratamiento: registro.tratamiento,
    examenesExternos: registro.examenesExternos,
    montoConsulta: registro.montoConsulta,
    estadoPago: registro.estadoPago,
  };
}

export const atencionService = {
  async historialDeMascota(mascotaId: number): Promise<AtencionMedica[]> {
    if (!(await mascotaRepository.findById(mascotaId))) {
      throw new DatosDeAtencionInvalidosError("La mascota no existe");
    }
    const registros = await atencionRepository.findByMascotaId(mascotaId);
    return Promise.all(registros.map(hidratar));
  },

  async crear(input: NuevaAtencionInput): Promise<AtencionMedica> {
    // Dado que faltan campos obligatorios (diagnóstico/tratamiento), se previene el guardado (HU3).
    if (
      !input.mascotaId ||
      !input.veterinarioId ||
      !input.tipoServicio?.trim() ||
      !input.diagnostico?.trim() ||
      !input.tratamiento?.trim()
    ) {
      throw new DatosDeAtencionInvalidosError("Tipo de servicio, diagnóstico y tratamiento son obligatorios");
    }
    if (!(await mascotaRepository.findById(input.mascotaId)) || !(await veterinarioRepository.findById(input.veterinarioId))) {
      throw new DatosDeAtencionInvalidosError("Mascota o veterinario inválido");
    }

    const medicamentosConsumidos = (input.medicamentos ?? []).filter((m) => m.medicamentoId && m.cantidad > 0);
    // Se valida el stock ANTES de crear la atención, para no dejar un registro huérfano si falta stock (HU9).
    if (medicamentosConsumidos.length > 0) {
      await medicamentoService.validarDisponibilidad(medicamentosConsumidos);
    }

    const registro = await atencionRepository.create({
      mascotaId: input.mascotaId,
      veterinarioId: input.veterinarioId,
      tipoServicio: input.tipoServicio.trim(),
      diagnostico: input.diagnostico.trim(),
      tratamiento: input.tratamiento.trim(),
      examenesExternos: input.examenesExternos?.trim() ?? "",
      montoConsulta: Number(input.montoConsulta) || 0,
    });

    if (medicamentosConsumidos.length > 0) {
      await medicamentoService.consumirParaAtencion(registro.id, medicamentosConsumidos);
    }

    return hidratar(registro);
  },
};
