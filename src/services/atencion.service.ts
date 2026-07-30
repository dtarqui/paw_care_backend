import { AtencionRegistro } from "../data/atenciones.data";
import { atencionRepository } from "../repositories/atencion.repository";
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

function hidratar(registro: AtencionRegistro): AtencionMedica {
  const mascota = mascotaRepository.findById(registro.mascotaId)!;
  const veterinario = veterinarioRepository.findById(registro.veterinarioId)!;
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
  historialDeMascota(mascotaId: number): AtencionMedica[] {
    if (!mascotaRepository.findById(mascotaId)) {
      throw new DatosDeAtencionInvalidosError("La mascota no existe");
    }
    return atencionRepository.findByMascotaId(mascotaId).map(hidratar);
  },

  crear(input: NuevaAtencionInput): AtencionMedica {
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
    if (!mascotaRepository.findById(input.mascotaId) || !veterinarioRepository.findById(input.veterinarioId)) {
      throw new DatosDeAtencionInvalidosError("Mascota o veterinario inválido");
    }

    const medicamentosConsumidos = (input.medicamentos ?? []).filter((m) => m.medicamentoId && m.cantidad > 0);
    // Se valida el stock ANTES de crear la atención, para no dejar un registro huérfano si falta stock (HU9).
    if (medicamentosConsumidos.length > 0) {
      medicamentoService.validarDisponibilidad(medicamentosConsumidos);
    }

    const registro: AtencionRegistro = {
      id: atencionRepository.nextId(),
      mascotaId: input.mascotaId,
      veterinarioId: input.veterinarioId,
      fecha: new Date().toISOString(),
      tipoServicio: input.tipoServicio.trim(),
      diagnostico: input.diagnostico.trim(),
      tratamiento: input.tratamiento.trim(),
      examenesExternos: input.examenesExternos?.trim() ?? "",
      montoConsulta: Number(input.montoConsulta) || 0,
      estadoPago: "PENDIENTE", // queda disponible para cobrar en el módulo de Pagos (HU4)
    };
    atencionRepository.create(registro);

    if (medicamentosConsumidos.length > 0) {
      medicamentoService.consumirParaAtencion(registro.id, medicamentosConsumidos);
    }

    return hidratar(registro);
  },
};
