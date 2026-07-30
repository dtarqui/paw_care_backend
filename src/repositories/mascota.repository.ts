import { MascotaRegistro, mascotas } from "../data/mascotas.data";
import { Mascota } from "../types";
import { propietarioRepository } from "./propietario.repository";

function hidratar(registro: MascotaRegistro): Mascota {
  const propietario = propietarioRepository.findById(registro.propietarioId);
  if (!propietario) {
    throw new Error(`Integridad de datos: la mascota ${registro.id} referencia un propietario inexistente`);
  }
  const { propietarioId: _propietarioId, ...resto } = registro;
  return { ...resto, propietario };
}

export const mascotaRepository = {
  findAll(): Mascota[] {
    return mascotas.map(hidratar);
  },

  findById(id: number): Mascota | undefined {
    const registro = mascotas.find((m) => m.id === id);
    return registro ? hidratar(registro) : undefined;
  },

  findByPropietarioCi(ci: string): Mascota[] {
    return mascotas.map(hidratar).filter((m) => m.propietario.ci === ci);
  },

  existeParaPropietario(propietarioId: number, nombre: string, especie: string): boolean {
    return mascotas.some(
      (m) =>
        m.propietarioId === propietarioId &&
        m.nombre.toLowerCase() === nombre.toLowerCase() &&
        m.especie.toLowerCase() === especie.toLowerCase()
    );
  },

  create(registro: MascotaRegistro): Mascota {
    mascotas.push(registro);
    return hidratar(registro);
  },

  nextId(): number {
    return Math.max(0, ...mascotas.map((m) => m.id)) + 1;
  },
};
