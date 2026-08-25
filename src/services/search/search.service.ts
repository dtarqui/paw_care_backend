import { ownerSearchProvider } from "./owner.searchProvider";
import { petSearchProvider } from "./pet.searchProvider";
import type { SearchProvider, SearchResult } from "./searchProvider";

/** Orden de los proveedores = orden en que aparecen los grupos en la UI. */
const PROVIDERS: SearchProvider[] = [petSearchProvider, ownerSearchProvider];

/** Por debajo de 2 caracteres cualquier término trae media base: no se consulta. */
const MIN_TERM_LENGTH = 2;
const DEFAULT_LIMIT_PER_TYPE = 5;

export const searchService = {
  async search(rawTerm: string, limitPerType = DEFAULT_LIMIT_PER_TYPE): Promise<SearchResult[]> {
    const term = rawTerm.trim();
    if (term.length < MIN_TERM_LENGTH) return [];

    // Los proveedores son independientes entre sí: se consultan en paralelo y el
    // orden final lo da PROVIDERS, no el tiempo de respuesta de cada uno.
    const perProvider = await Promise.all(PROVIDERS.map((provider) => provider.search(term, limitPerType)));
    return perProvider.flat();
  },
};
