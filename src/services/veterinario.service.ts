import { veterinarioRepository } from "../repositories/veterinario.repository";

export const veterinarioService = {
  listar() {
    return veterinarioRepository.findAll();
  },
};
