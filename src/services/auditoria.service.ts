import { auditoriaRepository } from "../repositories/auditoria.repository";

export const auditoriaService = {
  listar(page = 1, pageSize = 20) {
    return auditoriaRepository.findAllPaginado(page, pageSize);
  },
};
