import { loginEventRepository, LoginEventFilters } from "../repositories/loginEvent.repository";
import { LoginEvent, Paginated } from "../types";

/** Cuánto hacia atrás mira el resumen de la cabecera. Un día cubre "¿qué pasó desde
 * ayer?", que es la pregunta con la que se entra a esta pantalla. */
const SUMMARY_HOURS = 24;

export const loginEventService = {
  list(page: number, pageSize: number, filters: LoginEventFilters): Promise<Paginated<LoginEvent>> {
    return loginEventRepository.findAllPaginated(page, pageSize, filters);
  },

  summary(): Promise<{ successes: number; failures: number }> {
    return loginEventRepository.summarySince(SUMMARY_HOURS);
  },
};
