import { vetRepository } from "../repositories/vet.repository";

export const vetService = {
  list(activeOnly = false) {
    return activeOnly ? vetRepository.findAllActive() : vetRepository.findAll();
  },
};
