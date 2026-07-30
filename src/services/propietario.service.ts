import { propietarioRepository } from "../repositories/propietario.repository";

export const propietarioService = {
  buscarPorCi(ci: string) {
    return propietarioRepository.findByCi(ci);
  },
};
