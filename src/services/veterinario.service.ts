import { veterinarioRepository } from "../repositories/veterinario.repository";

export const veterinarioService = {
  listar(soloActivos = false) {
    return soloActivos ? veterinarioRepository.findAllActivos() : veterinarioRepository.findAll();
  },
};
